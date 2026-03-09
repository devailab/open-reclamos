'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { auth } from '@/lib/auth'

export type AuthActionResult = {
	error: string | null
}

export async function $loginAction(
	email: string,
	password: string,
): Promise<AuthActionResult> {
	const result = await auth.api.signInEmail({
		body: { email, password },
	})

	if (!result || result.user === null) {
		return {
			error: 'Credenciales inválidas. Verifica tu email y contraseña.',
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
	const result = await auth.api.signUpEmail({
		body: { name, email, password },
	})

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
