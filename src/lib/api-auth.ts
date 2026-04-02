import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/database/database'
import { organizationMembers, users } from '@/database/schema'

export interface ApiAuthContext {
	userId: string
	organizationId: string
}

/**
 * Valida el API key del header `Authorization: Bearer <key>` y retorna
 * el contexto del usuario autenticado (userId + organizationId).
 * Retorna null si el key es inválido, el usuario no existe o no pertenece
 * a ninguna organización.
 */
export async function resolveApiKey(
	request: NextRequest,
): Promise<ApiAuthContext | null> {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return null

	const apiKey = authHeader.slice(7).trim()
	if (!apiKey) return null

	const [userRow] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.apiKey, apiKey))
		.limit(1)

	if (!userRow) return null

	const [membership] = await db
		.select({ organizationId: organizationMembers.organizationId })
		.from(organizationMembers)
		.where(eq(organizationMembers.userId, userRow.id))
		.limit(1)

	if (!membership) return null

	return {
		userId: userRow.id,
		organizationId: membership.organizationId,
	}
}

export function unauthorizedResponse(
	message = 'API key inválida o no autorizada.',
) {
	return Response.json({ error: message }, { status: 401 })
}
