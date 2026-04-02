'use server'

import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { auth } from '@/lib/auth'
import { getSession } from '@/lib/auth-server'

export type AccountActionResult = { error: string } | { success: true }

export type ApiKeyActionResult =
	| { error: string }
	| { success: true; apiKey: string }

function generateApiKeyValue(): string {
	return `or_${crypto.randomBytes(24).toString('hex')}`
}

export async function $updateProfileAction(input: {
	name: string | null
}): Promise<AccountActionResult> {
	const session = await getSession()
	if (!session) return { error: 'No estás autenticado' }

	const name = input.name?.trim()
	if (!name) return { error: 'El nombre es requerido' }

	try {
		await auth.api.updateUser({
			body: { name },
			headers: await headers(),
		})
		revalidatePath('/dashboard/account')
		return { success: true }
	} catch {
		return { error: 'No se pudo actualizar el perfil. Intenta de nuevo.' }
	}
}

export async function $changePasswordAction(input: {
	currentPassword: string | null
	newPassword: string | null
}): Promise<AccountActionResult> {
	const session = await getSession()
	if (!session) return { error: 'No estás autenticado' }

	if (!input.currentPassword || !input.newPassword) {
		return { error: 'Todos los campos son requeridos' }
	}

	try {
		await auth.api.changePassword({
			body: {
				currentPassword: input.currentPassword,
				newPassword: input.newPassword,
				revokeOtherSessions: false,
			},
			headers: await headers(),
		})
		return { success: true }
	} catch {
		return { error: 'Contraseña actual incorrecta. Intenta de nuevo.' }
	}
}

export async function $generateApiKeyAction(): Promise<ApiKeyActionResult> {
	const session = await getSession()
	if (!session) return { error: 'No estás autenticado' }

	const [existing] = await db
		.select({ apiKey: users.apiKey })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (existing?.apiKey) {
		return {
			error: 'Ya tienes una API key activa. Usa regenerar para crear una nueva.',
		}
	}

	const apiKey = generateApiKeyValue()

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({ apiKey, apiKeyCreatedAt: new Date() })
				.where(eq(users.id, session.user.id))

			await createAuditLog(
				{
					userId: session.user.id,
					action: AUDIT_LOG.API_KEY_GENERATED,
					entityType: 'user',
					entityId: session.user.id,
					description: 'API key generada',
				},
				tx,
			)
		})
	} catch {
		return { error: 'No se pudo generar la API key. Intenta de nuevo.' }
	}

	revalidatePath('/dashboard/account')
	return { success: true, apiKey }
}

export async function $regenerateApiKeyAction(): Promise<ApiKeyActionResult> {
	const session = await getSession()
	if (!session) return { error: 'No estás autenticado' }

	const apiKey = generateApiKeyValue()

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({ apiKey, apiKeyCreatedAt: new Date() })
				.where(eq(users.id, session.user.id))

			await createAuditLog(
				{
					userId: session.user.id,
					action: AUDIT_LOG.API_KEY_REGENERATED,
					entityType: 'user',
					entityId: session.user.id,
					description: 'API key regenerada',
				},
				tx,
			)
		})
	} catch {
		return { error: 'No se pudo regenerar la API key. Intenta de nuevo.' }
	}

	revalidatePath('/dashboard/account')
	return { success: true, apiKey }
}
