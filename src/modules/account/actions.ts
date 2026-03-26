'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getSession } from '@/lib/auth-server'

export type AccountActionResult = { error: string } | { success: true }

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
