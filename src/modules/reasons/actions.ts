'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { complaintReasons } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { getOrganizationForUser } from './queries'
import { validateReason } from './validation'

export type ActionResult = { error: string } | { success: true }

export async function $createReasonAction(input: {
	reason: string
	parentId: string | null
}): Promise<ActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId)
		return { error: 'No se encontró una organización asociada.' }

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
					eq(complaintReasons.organizationId, organizationId),
					isNull(complaintReasons.deletedAt),
				),
			)
			.limit(1)
		if (!parent) return { error: 'El motivo padre no es válido.' }
	}

	await db.insert(complaintReasons).values({
		reason: input.reason.trim(),
		parentId: input.parentId,
		organizationId,
		createdBy: session.user.id,
	})

	revalidatePath('/dashboard/reasons')
	return { success: true }
}

export async function $updateReasonAction(input: {
	id: string
	reason: string
}): Promise<ActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId)
		return { error: 'No se encontró una organización asociada.' }

	const reasonError = validateReason(input.reason)
	if (reasonError) return { error: reasonError }

	// Verificar que el motivo pertenece a esta organización y no está eliminado
	const [existing] = await db
		.select({ id: complaintReasons.id })
		.from(complaintReasons)
		.where(
			and(
				eq(complaintReasons.id, input.id),
				eq(complaintReasons.organizationId, organizationId),
				isNull(complaintReasons.deletedAt),
			),
		)
		.limit(1)
	if (!existing) return { error: 'El motivo no fue encontrado.' }

	await db
		.update(complaintReasons)
		.set({
			reason: input.reason.trim(),
			updatedAt: new Date(),
			updatedBy: session.user.id,
		})
		.where(
			and(
				eq(complaintReasons.id, input.id),
				eq(complaintReasons.organizationId, organizationId),
			),
		)

	revalidatePath('/dashboard/reasons')
	return { success: true }
}

export async function $deleteReasonAction(id: string): Promise<ActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId)
		return { error: 'No se encontró una organización asociada.' }

	// Verificar que el motivo pertenece a esta organización y no está eliminado
	const [existing] = await db
		.select({ id: complaintReasons.id })
		.from(complaintReasons)
		.where(
			and(
				eq(complaintReasons.id, id),
				eq(complaintReasons.organizationId, organizationId),
				isNull(complaintReasons.deletedAt),
			),
		)
		.limit(1)
	if (!existing) return { error: 'El motivo no fue encontrado.' }

	const now = new Date()
	const userId = session.user.id

	// Soft delete del motivo y sus hijos directos
	await db
		.update(complaintReasons)
		.set({ deletedAt: now, deletedBy: userId })
		.where(
			and(
				eq(complaintReasons.id, id),
				eq(complaintReasons.organizationId, organizationId),
			),
		)

	await db
		.update(complaintReasons)
		.set({ deletedAt: now, deletedBy: userId })
		.where(
			and(
				eq(complaintReasons.parentId, id),
				eq(complaintReasons.organizationId, organizationId),
				isNull(complaintReasons.deletedAt),
			),
		)

	revalidatePath('/dashboard/reasons')
	return { success: true }
}
