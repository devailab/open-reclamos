'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { organizationMembers, organizations } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { getOrganizationSettingsForUser } from './queries'
import {
	normalizeUpdateOrganizationInput,
	type UpdateOrganizationInput,
	validateUpdateOrganizationInput,
} from './validation'

export type SettingsActionResult = { error: string } | { success: true }

type CompleteUpdateOrganizationInput = ReturnType<
	typeof normalizeUpdateOrganizationInput
> & {
	name: string
	legalName: string
	ubigeoId: string
	addressType: string
	address: string
}

function hasRequiredOrganizationFields(
	input: ReturnType<typeof normalizeUpdateOrganizationInput>,
): input is CompleteUpdateOrganizationInput {
	return Boolean(
		input.name &&
			input.legalName &&
			input.ubigeoId &&
			input.addressType &&
			input.address,
	)
}

export async function $updateOrganizationSettingsAction(
	input: UpdateOrganizationInput,
): Promise<SettingsActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const org = await getOrganizationSettingsForUser(session.user.id)
	if (!org) return { error: 'No se encontró una organización asociada.' }

	// Solo administradores pueden editar la organización
	const [membership] = await db
		.select({ role: organizationMembers.role })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.userId, session.user.id),
				eq(organizationMembers.organizationId, org.id),
			),
		)
		.limit(1)

	if (membership?.role !== 'admin') {
		return { error: 'No tienes permisos para editar la organización.' }
	}

	const normalizedInput = normalizeUpdateOrganizationInput(input)
	const validationError = validateUpdateOrganizationInput(normalizedInput)
	if (validationError) return { error: validationError }
	if (!hasRequiredOrganizationFields(normalizedInput)) {
		return {
			error: 'No se pudo actualizar la organización. Inténtalo nuevamente.',
		}
	}

	try {
		await db
			.update(organizations)
			.set({
				name: normalizedInput.name,
				legalName: normalizedInput.legalName,
				ubigeoId: normalizedInput.ubigeoId,
				addressType: normalizedInput.addressType,
				address: normalizedInput.address,
				phoneCode: normalizedInput.phoneCode,
				phone: normalizedInput.phone,
				website: normalizedInput.website,
				updatedAt: new Date(),
				updatedBy: session.user.id,
			})
			.where(eq(organizations.id, org.id))
	} catch {
		return {
			error: 'No se pudo actualizar la organización. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/settings')
	return { success: true }
}
