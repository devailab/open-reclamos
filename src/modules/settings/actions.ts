'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { organizations } from '@/database/schema'
import { createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
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

	const membership = await getMembershipContext(session.user.id)
	if (!membership || membership.organizationId !== org.id) {
		return { error: 'No se encontró una membresía válida.' }
	}

	if (!hasPermission(membership, 'settings.manage')) {
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
		await db.transaction(async (tx) => {
			await tx
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

			await createAuditLog(
				{
					organizationId: org.id,
					userId: session.user.id,
					action: 'organization.updated',
					entityType: 'organization',
					entityId: org.id,
					oldData: {
						name: org.name,
						legalName: org.legalName,
						ubigeoId: org.ubigeoId,
						addressType: org.addressType,
						address: org.address,
						phoneCode: org.phoneCode,
						phone: org.phone,
						website: org.website,
					},
					newData: {
						name: normalizedInput.name,
						legalName: normalizedInput.legalName,
						ubigeoId: normalizedInput.ubigeoId,
						addressType: normalizedInput.addressType,
						address: normalizedInput.address,
						phoneCode: normalizedInput.phoneCode,
						phone: normalizedInput.phone,
						website: normalizedInput.website,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar la organización. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/settings')
	return { success: true }
}
