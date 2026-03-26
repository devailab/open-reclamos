'use server'

import type { APIError } from 'better-call'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { auth } from '@/lib/auth'

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
		default:
			return fallbackMessage
	}
}

export async function $loginAction(
	email: string,
	password: string,
): Promise<AuthActionResult> {
	let result: Awaited<ReturnType<typeof auth.api.signInEmail>>

	try {
		result = await auth.api.signInEmail({
			body: { email, password },
		})
	} catch (error) {
		return {
			error: getAuthErrorMessage(
				error,
				'No se pudo iniciar sesión. Inténtalo nuevamente.',
			),
		}
	}

	if (!result || result.user === null) {
		return {
			error: 'Credenciales inválidas. Verifica tu correo y contraseña.',
		}
	}

	const [userData] = await db
		.select({ setupStatus: users.setupStatus })
		.from(users)
		.where(eq(users.id, result.user.id))
		.limit(1)

	if (userData?.setupStatus !== 'complete') {
		redirect('/setup')
	}

	redirect('/dashboard')
}

export async function $registerAction(
	name: string,
	email: string,
	password: string,
): Promise<AuthActionResult> {
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
	await auth.api.signOut({
		headers: await headers(),
	})
	redirect('/login')
}
