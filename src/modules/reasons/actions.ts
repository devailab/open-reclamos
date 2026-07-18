'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/database/database'
import { complaintReasons } from '@/database/schema'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import type { ActionResult } from '@/modules/shared/types'
import { validateReason } from './validation'

export async function $createReasonAction(input: {
	reason: string
	parentId: string | null
}): Promise<ActionResult> {
	const access = await requireAccess('reasons.manage')
	if ('error' in access) return { error: access.error }

	const reasonError = validateReason(input.reason)
	if (reasonError) return { error: reasonError }

	// Validar que el padre exista y pertenezca a la misma organización
	if (input.parentId) {
		const [parent] = await db
			.select({ id: complaintReasons.id })
			.from(complaintReasons)
			.where(
				and(
					eq(complaintReasons.id, input.parentId),
					eq(
						complaintReasons.organizationId,
						access.membership.organizationId,
					),
					isNull(complaintReasons.deletedAt),
				),
			)
			.limit(1)
		if (!parent) return { error: MESSAGES.reasons.invalidParent }
	}

	await db.insert(complaintReasons).values({
		reason: input.reason.trim(),
		parentId: input.parentId,
		organizationId: access.membership.organizationId,
		createdBy: access.session.user.id,
	})

	revalidatePath('/dashboard/reasons')
	return { success: true }
}

export async function $updateReasonAction(input: {
	id: string
	reason: string
}): Promise<ActionResult> {
	const access = await requireAccess('reasons.manage')
	if ('error' in access) return { error: access.error }

	const reasonError = validateReason(input.reason)
	if (reasonError) return { error: reasonError }

	// Verificar que el motivo pertenece a esta organización y no está eliminado
	const [existing] = await db
		.select({ id: complaintReasons.id })
		.from(complaintReasons)
		.where(
			and(
				eq(complaintReasons.id, input.id),
				eq(
					complaintReasons.organizationId,
					access.membership.organizationId,
				),
				isNull(complaintReasons.deletedAt),
			),
		)
		.limit(1)
	if (!existing) return { error: MESSAGES.reasons.notFound }

	await db
		.update(complaintReasons)
		.set({
			reason: input.reason.trim(),
			updatedAt: new Date(),
			updatedBy: access.session.user.id,
		})
		.where(
			and(
				eq(complaintReasons.id, input.id),
				eq(
					complaintReasons.organizationId,
					access.membership.organizationId,
				),
			),
		)

	revalidatePath('/dashboard/reasons')
	return { success: true }
}

export async function $deleteReasonAction(id: string): Promise<ActionResult> {
	const access = await requireAccess('reasons.manage')
	if ('error' in access) return { error: access.error }

	// Verificar que el motivo pertenece a esta organización y no está eliminado
	const [existing] = await db
		.select({ id: complaintReasons.id })
		.from(complaintReasons)
		.where(
			and(
				eq(complaintReasons.id, id),
				eq(
					complaintReasons.organizationId,
					access.membership.organizationId,
				),
				isNull(complaintReasons.deletedAt),
			),
		)
		.limit(1)
	if (!existing) return { error: MESSAGES.reasons.notFound }

	const now = new Date()

	// Soft delete del motivo y sus hijos directos
	await db
		.update(complaintReasons)
		.set({ deletedAt: now, deletedBy: access.session.user.id })
		.where(
			and(
				eq(complaintReasons.id, id),
				eq(
					complaintReasons.organizationId,
					access.membership.organizationId,
				),
			),
		)

	await db
		.update(complaintReasons)
		.set({ deletedAt: now, deletedBy: access.session.user.id })
		.where(
			and(
				eq(complaintReasons.parentId, id),
				eq(
					complaintReasons.organizationId,
					access.membership.organizationId,
				),
				isNull(complaintReasons.deletedAt),
			),
		)

	revalidatePath('/dashboard/reasons')
	return { success: true }
}
