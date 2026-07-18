import crypto from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/database/database'
import { organizationMembers, users } from '@/database/schema'
import {
	getMembershipContext,
	type MembershipContext,
} from '@/modules/rbac/queries'

export interface ApiAuthContext {
	userId: string
	organizationId: string
	membership: MembershipContext
}

export function hashApiKey(apiKey: string): string {
	return crypto.createHash('sha256').update(apiKey).digest('hex')
}

export async function resolveApiKeyFromString(
	apiKey: string,
): Promise<ApiAuthContext | null> {
	if (!apiKey) return null

	const [userRow] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.apiKeyHash, hashApiKey(apiKey)))
		.limit(1)

	if (!userRow) return null

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

	if (!membershipRow) return null

	const membership = await getMembershipContext(
		userRow.id,
		membershipRow.organizationId,
	)
	if (!membership) return null

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
 * Retorna null si el key es inválido, el usuario no existe o no pertenece
 * a ninguna organización.
 */
export async function resolveApiKey(
	request: NextRequest,
): Promise<ApiAuthContext | null> {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return null

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
