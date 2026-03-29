'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type DbTransaction, db } from '@/database/database'
import { organizationSettings, organizations } from '@/database/schema'
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
	responseDeadlineDays: number
}

function hasRequiredOrganizationFields(
	input: ReturnType<typeof normalizeUpdateOrganizationInput>,
): input is CompleteUpdateOrganizationInput {
	return Boolean(
		input.name &&
			input.legalName &&
			input.ubigeoId &&
			input.addressType &&
			input.address &&
			input.responseDeadlineDays !== null,
	)
}

async function createOrganizationFormAvailabilityAuditLog(
	params: {
		organizationId: string
		userId: string
		previousValue: boolean
		nextValue: boolean
	},
	tx: DbTransaction,
) {
	if (params.previousValue === params.nextValue) return

	await createAuditLog(
		{
			organizationId: params.organizationId,
			userId: params.userId,
			action: params.nextValue
				? 'organization.form.enabled'
				: 'organization.form.disabled',
			entityType: 'organization_form',
			entityId: params.organizationId,
			oldData: { formEnabled: params.previousValue },
			newData: { formEnabled: params.nextValue },
		},
		tx,
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
			const now = new Date()

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
					updatedAt: now,
					updatedBy: session.user.id,
				})
				.where(eq(organizations.id, org.id))

			await tx
				.insert(organizationSettings)
				.values({
					organizationId: org.id,
					formEnabled: normalizedInput.formEnabled,
					responseDeadlineDays: normalizedInput.responseDeadlineDays,
					createdBy: session.user.id,
					updatedAt: now,
					updatedBy: session.user.id,
				})
				.onConflictDoUpdate({
					target: organizationSettings.organizationId,
					set: {
						formEnabled: normalizedInput.formEnabled,
						responseDeadlineDays:
							normalizedInput.responseDeadlineDays,
						updatedAt: now,
						updatedBy: session.user.id,
					},
				})

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
						formEnabled: org.formEnabled,
						responseDeadlineDays: org.responseDeadlineDays,
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
						formEnabled: normalizedInput.formEnabled,
						responseDeadlineDays:
							normalizedInput.responseDeadlineDays,
					},
				},
				tx,
			)

			await createOrganizationFormAvailabilityAuditLog(
				{
					organizationId: org.id,
					userId: session.user.id,
					previousValue: org.formEnabled,
					nextValue: normalizedInput.formEnabled,
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
	revalidatePath('/dashboard/stores')
	revalidatePath('/c/[slug]', 'page')
	revalidatePath('/s/[slug]', 'page')
	return { success: true }
}
