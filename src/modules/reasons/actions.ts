'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { complaintReasons } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { validateReason } from './validation'

export type ActionResult = { error: string } | { success: true }

async function requireAccess(permissionKey: string) {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return {
			error: 'No tienes permisos para realizar esta acción.',
		} as const
	}

	return { session, membership } as const
}

export async function $createReasonAction(input: {
	reason: string
	parentId: string | null
}): Promise<ActionResult> {
	const access = await requireAccess('reasons.manage')
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

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
		if (!parent) return { error: 'El motivo padre no es válido.' }
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
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

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
	if (!existing) return { error: 'El motivo no fue encontrado.' }

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
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

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
	if (!existing) return { error: 'El motivo no fue encontrado.' }

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
