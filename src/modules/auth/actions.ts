'use server'

import type { APIError } from 'better-call'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { organizationMembers, users } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { auth } from '@/lib/auth'
import { ALLOW_PUBLIC_REGISTRATION } from '@/lib/config'
import { hasAnyUser } from '@/modules/auth/queries'
import {
	clearActiveOrganizationCookie,
	getActiveOrganizationCookie,
	setActiveOrganizationCookie,
} from '@/modules/rbac/cookies'
import { selectActiveOrganizationId } from '@/modules/rbac/organization-selection'
import { getUserOrganizationOptions } from '@/modules/rbac/queries'

export type AuthActionResult = {
	error: string | null
}

function isAuthApiError(error: unknown): error is APIError {
	return typeof error === 'object' && error !== null && 'body' in error
}

function getAuthErrorMessage(error: unknown, fallbackMessage: string): string {
	if (!isAuthApiError(error)) {
		return fallbackMessage
	}

	switch (error.body?.code) {
		case 'INVALID_EMAIL':
			return 'Ingresa un correo electrónico válido.'
		case 'INVALID_EMAIL_OR_PASSWORD':
		case 'INVALID_PASSWORD':
			return 'Credenciales inválidas. Verifica tu correo y contraseña.'
		case 'PASSWORD_TOO_SHORT':
			return 'La contraseña debe tener al menos 8 caracteres.'
		case 'USER_ALREADY_EXISTS':
		case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
			return 'Ya existe una cuenta con este correo. Usa otro email.'
		case 'OTP_EXPIRED':
			return 'El código expiró. Solicita uno nuevo.'
		case 'INVALID_OTP':
			return 'Código incorrecto. Verifica e intenta nuevamente.'
		case 'TOO_MANY_ATTEMPTS':
			return 'Demasiados intentos fallidos. Solicita un nuevo código.'
		default:
			return fallbackMessage
	}
}

async function getLoginAuditContextByEmail(email: string) {
	const normalizedEmail = email.trim().toLowerCase()

	const [user] = await db
		.select({
			userId: users.id,
			email: users.email,
			organizationId: organizationMembers.organizationId,
		})
		.from(users)
		.leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
		.where(eq(users.email, normalizedEmail))
		.limit(1)

	return user ?? null
}

async function getLoginAuditContextByUserId(userId: string) {
	const [user] = await db
		.select({
			userId: users.id,
			email: users.email,
			organizationId: organizationMembers.organizationId,
			setupStatus: users.setupStatus,
		})
		.from(users)
		.leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
		.where(eq(users.id, userId))
		.limit(1)

	return user ?? null
}

export async function $loginAction(
	email: string,
	password: string,
): Promise<AuthActionResult> {
	const reqHeaders = await headers()
	const ipAddress =
		reqHeaders.get('x-forwarded-for') ?? reqHeaders.get('x-real-ip')
	const userAgent = reqHeaders.get('user-agent')
	const normalizedEmail = email.trim().toLowerCase()
	let result: Awaited<ReturnType<typeof auth.api.signInEmail>>

	try {
		result = await auth.api.signInEmail({
			body: { email: normalizedEmail, password },
		})
	} catch (error) {
		const description = getAuthErrorMessage(
			error,
			'No se pudo iniciar sesión. Inténtalo nuevamente.',
		)
		const auditContext = await getLoginAuditContextByEmail(normalizedEmail)

		await createAuditLog({
			organizationId: auditContext?.organizationId ?? null,
			userId: auditContext?.userId ?? null,
			action: AUDIT_LOG.USER_LOGIN_FAILED,
			entityType: 'auth',
			entityId: auditContext?.userId ?? undefined,
			description,
			newData: {
				email: normalizedEmail,
			},
			ipAddress,
			userAgent,
		})

		return {
			error: description,
		}
	}

	if (!result || result.user === null) {
		const auditContext = await getLoginAuditContextByEmail(normalizedEmail)
		const description =
			'Credenciales inválidas. Verifica tu correo y contraseña.'

		await createAuditLog({
			organizationId: auditContext?.organizationId ?? null,
			userId: auditContext?.userId ?? null,
			action: AUDIT_LOG.USER_LOGIN_FAILED,
			entityType: 'auth',
			entityId: auditContext?.userId ?? undefined,
			description,
			newData: {
				email: normalizedEmail,
			},
			ipAddress,
			userAgent,
		})

		return {
			error: description,
		}
	}

	const userData = await getLoginAuditContextByUserId(result.user.id)

	await createAuditLog({
		organizationId: userData?.organizationId ?? null,
		userId: result.user.id,
		action: AUDIT_LOG.USER_LOGIN_SUCCESS,
		entityType: 'auth',
		entityId: result.user.id,
		newData: {
			email: userData?.email ?? normalizedEmail,
			setupStatus: userData?.setupStatus ?? null,
		},
		ipAddress,
		userAgent,
	})

	if (userData?.setupStatus !== 'complete') {
		redirect('/setup')
	}

	const organizations = await getUserOrganizationOptions(result.user.id)
	const activeOrganizationId = selectActiveOrganizationId(
		await getActiveOrganizationCookie(),
		organizations.map((organization) => organization.id),
	)
	if (activeOrganizationId) {
		await setActiveOrganizationCookie(activeOrganizationId)
	}

	redirect('/dashboard')
}

export async function $registerAction(
	name: string,
	email: string,
	password: string,
): Promise<AuthActionResult> {
	const anyUser = await hasAnyUser()
	if (!ALLOW_PUBLIC_REGISTRATION && anyUser) {
		return { error: 'El registro de nuevas cuentas no está disponible.' }
	}

	let result: Awaited<ReturnType<typeof auth.api.signUpEmail>>

	try {
		result = await auth.api.signUpEmail({
			body: { name, email, password },
		})
	} catch (error) {
		return {
			error: getAuthErrorMessage(
				error,
				'No se pudo crear la cuenta. Intenta nuevamente.',
			),
		}
	}

	if (!result || result.user === null) {
		return { error: 'No se pudo crear la cuenta. Intenta con otro email.' }
	}

	await db
		.update(users)
		.set({ setupStatus: 'organization' })
		.where(eq(users.id, result.user.id))

	redirect('/setup')
}

export async function $logoutAction(): Promise<void> {
	await clearActiveOrganizationCookie()
	await auth.api.signOut({
		headers: await headers(),
	})
	redirect('/login')
}

export async function $sendRegistrationVerificationAction(
	name: string,
	email: string,
	password: string,
): Promise<AuthActionResult> {
	const anyUser = await hasAnyUser()
	if (!ALLOW_PUBLIC_REGISTRATION && anyUser) {
		return { error: 'El registro de nuevas cuentas no está disponible.' }
	}

	const normalizedEmail = email.trim().toLowerCase()
	const reqHeaders = await headers()

	const [existingUser] = await db
		.select({ id: users.id, emailVerified: users.emailVerified })
		.from(users)
		.where(eq(users.email, normalizedEmail))
		.limit(1)

	if (existingUser?.emailVerified) {
		return {
			error: 'Ya existe una cuenta verificada con este correo. Inicia sesión.',
		}
	}

	// Only create if the user doesn't exist yet (avoids USER_ALREADY_EXISTS error on resend)
	if (!existingUser) {
		try {
			await auth.api.signUpEmail({
				body: { name, email: normalizedEmail, password },
			})
		} catch (error) {
			return {
				error: getAuthErrorMessage(
					error,
					'No se pudo crear la cuenta. Intenta nuevamente.',
				),
			}
		}
	}

	try {
		await auth.api.sendVerificationOTP({
			body: {
				email: normalizedEmail,
				type: 'email-verification',
			},
			headers: reqHeaders,
		})
	} catch (error) {
		return {
			error: getAuthErrorMessage(
				error,
				'No se pudo enviar el código. Intenta nuevamente.',
			),
		}
	}

	return { error: null }
}

export async function $verifyAndRegisterAction(
	email: string,
	code: string,
): Promise<AuthActionResult> {
	const anyUser = await hasAnyUser()
	if (!ALLOW_PUBLIC_REGISTRATION && anyUser) {
		return { error: 'El registro de nuevas cuentas no está disponible.' }
	}

	const normalizedEmail = email.trim().toLowerCase()
	const reqHeaders = await headers()

	const [existingUser] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, normalizedEmail))
		.limit(1)

	if (!existingUser) {
		return {
			error: 'No se encontró la cuenta. Inicia el registro nuevamente.',
		}
	}

	try {
		await auth.api.verifyEmailOTP({
			body: { email: normalizedEmail, otp: code },
			headers: reqHeaders,
		})
	} catch (error) {
		return {
			error: getAuthErrorMessage(
				error,
				'No se pudo verificar el código. Intenta nuevamente.',
			),
		}
	}

	await db
		.update(users)
		.set({ setupStatus: 'organization' })
		.where(eq(users.id, existingUser.id))

	redirect('/setup')
}
