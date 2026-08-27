import crypto from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/database/database'
import { organizationMembers, users } from '@/database/schema'
import { isOrganizationActive } from '@/modules/platform/status'
import {
	getMembershipContext,
	type MembershipContext,
} from '@/modules/rbac/queries'
import { MESSAGES } from '@/modules/shared/messages'

export interface ApiAuthContext {
	userId: string
	organizationId: string
	membership: MembershipContext
}

export type ApiAuthFailure =
	| { failure: 'unauthorized' }
	| { failure: 'organization_suspended' }

/**
 * Resultado de la autenticación por API key. Es una unión discriminada para
 * que cada ruta tenga que distinguir entre "clave inválida" (401) y
 * "organización suspendida" (403): olvidarlo es un error de compilación.
 */
export type ApiAuthResult = ApiAuthContext | ApiAuthFailure

const UNAUTHORIZED: ApiAuthFailure = { failure: 'unauthorized' }

export function hashApiKey(apiKey: string): string {
	return crypto.createHash('sha256').update(apiKey).digest('hex')
}

export async function resolveApiKeyFromString(
	apiKey: string,
): Promise<ApiAuthResult> {
	if (!apiKey) return UNAUTHORIZED

	const [userRow] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.apiKeyHash, hashApiKey(apiKey)))
		.limit(1)

	if (!userRow) return UNAUTHORIZED

	// Selección determinista: la membresía más antigua del usuario
	const [membershipRow] = await db
		.select({ organizationId: organizationMembers.organizationId })
		.from(organizationMembers)
		.where(eq(organizationMembers.userId, userRow.id))
		.orderBy(
			asc(organizationMembers.createdAt),
			asc(organizationMembers.organizationId),
		)
		.limit(1)

	if (!membershipRow) return UNAUTHORIZED

	const membership = await getMembershipContext(
		userRow.id,
		membershipRow.organizationId,
	)
	if (!membership) return UNAUTHORIZED

	// Una organización suspendida a nivel plataforma pierde el acceso por API.
	const isActive = await isOrganizationActive(membership.organizationId)
	if (!isActive) return { failure: 'organization_suspended' }

	return {
		userId: userRow.id,
		organizationId: membership.organizationId,
		membership,
	}
}

/**
 * Valida el API key del header `Authorization: Bearer <key>` y retorna
 * el contexto del usuario autenticado con su membresía completa
 * (permisos efectivos y tiendas asignadas).
 * Retorna un `ApiAuthFailure` si el key es inválido, el usuario no existe,
 * no pertenece a ninguna organización o su organización está suspendida.
 */
export async function resolveApiKey(
	request: NextRequest,
): Promise<ApiAuthResult> {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return UNAUTHORIZED

	const apiKey = authHeader.slice(7).trim()
	return resolveApiKeyFromString(apiKey)
}

/**
 * Tiendas permitidas para el contexto: `undefined` = todas las tiendas,
 * lista = solo las asignadas (puede ser vacía).
 */
export function getAllowedStoreIds(
	membership: MembershipContext,
): string[] | undefined {
	return membership.storeAccessMode === 'selected'
		? membership.storeIds
		: undefined
}

export function unauthorizedResponse(
	message = 'API key inválida o no autorizada.',
) {
	return Response.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(
	message = 'No tienes permisos para realizar esta acción.',
) {
	return Response.json({ error: message }, { status: 403 })
}

/**
 * Respuesta HTTP para un fallo de autenticación por API key.
 */
export function apiAuthFailureResponse(
	failure: ApiAuthFailure,
	unauthorizedMessage?: string,
) {
	if (failure.failure === 'organization_suspended') {
		return forbiddenResponse(MESSAGES.platform.organizationSuspended)
	}

	return unauthorizedResponse(unauthorizedMessage)
}
