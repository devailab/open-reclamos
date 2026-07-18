'use server'

import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { hashApiKey } from '@/lib/api-auth'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { auth } from '@/lib/auth'
import { getSession } from '@/lib/auth-server'
import { SSO_ENABLED } from '@/lib/config'
import { MESSAGES } from '@/modules/shared/messages'

const SSO_MANAGED_ACCOUNT_ERROR =
	'Tu cuenta se administra desde el proveedor de identidad de tu organización.'

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
	if (SSO_ENABLED) return { error: SSO_MANAGED_ACCOUNT_ERROR }

	const session = await getSession()
	if (!session) return { error: MESSAGES.common.notAuthenticated }

	const name = input.name?.trim()
	if (!name) return { error: MESSAGES.account.nameRequired }

	try {
		await auth.api.updateUser({
			body: { name },
			headers: await headers(),
		})
		revalidatePath('/dashboard/account')
		return { success: true }
	} catch {
		return { error: MESSAGES.account.profileUpdateFailed }
	}
}

export async function $changePasswordAction(input: {
	currentPassword: string | null
	newPassword: string | null
}): Promise<AccountActionResult> {
	if (SSO_ENABLED) return { error: SSO_MANAGED_ACCOUNT_ERROR }

	const session = await getSession()
	if (!session) return { error: MESSAGES.common.notAuthenticated }

	if (!input.currentPassword || !input.newPassword) {
		return { error: MESSAGES.account.allFieldsRequired }
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
		return { error: MESSAGES.account.wrongCurrentPassword }
	}
}

export async function $generateApiKeyAction(): Promise<ApiKeyActionResult> {
	const session = await getSession()
	if (!session) return { error: MESSAGES.common.notAuthenticated }

	const [existing] = await db
		.select({ apiKeyHash: users.apiKeyHash })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (existing?.apiKeyHash) {
		return {
			error: MESSAGES.account.apiKeyAlreadyActive,
		}
	}

	const apiKey = generateApiKeyValue()

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({
					apiKeyHash: hashApiKey(apiKey),
					apiKeyCreatedAt: new Date(),
				})
				.where(eq(users.id, session.user.id))

			await createAuditLog({
				userId: session.user.id,
				action: AUDIT_LOG.API_KEY_GENERATED,
				entityType: 'user',
				entityId: session.user.id,
				description: 'API key generada',
			})
		})
	} catch {
		return { error: MESSAGES.account.apiKeyCreateFailed }
	}

	revalidatePath('/dashboard/account')
	return { success: true, apiKey }
}

export async function $regenerateApiKeyAction(): Promise<ApiKeyActionResult> {
	const session = await getSession()
	if (!session) return { error: MESSAGES.common.notAuthenticated }

	const apiKey = generateApiKeyValue()

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({
					apiKeyHash: hashApiKey(apiKey),
					apiKeyCreatedAt: new Date(),
				})
				.where(eq(users.id, session.user.id))

			await createAuditLog({
				userId: session.user.id,
				action: AUDIT_LOG.API_KEY_REGENERATED,
				entityType: 'user',
				entityId: session.user.id,
				description: 'API key regenerada',
			})
		})
	} catch {
		return { error: MESSAGES.account.apiKeyRegenerateFailed }
	}

	revalidatePath('/dashboard/account')
	return { success: true, apiKey }
}
