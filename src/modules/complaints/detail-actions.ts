'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { complaints } from '@/database/schema'
import { createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import { getPresignedDownloadUrl } from '@/lib/s3'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import type { ChangeableStatus } from './dashboard-validation'
import {
	type ComplaintAuditEntry,
	type ComplaintDetail,
	type ComplaintHistoryEntry,
	getComplaintAuditHistory,
	getComplaintDetailById,
	getComplaintHistory,
} from './detail-queries'
import { createComplaintHistoryEntry } from './history'

export interface GetComplaintDetailResult {
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
	history: ComplaintHistoryEntry[]
}

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

/**
 * Verifica que el usuario tenga acceso a la tienda del reclamo.
 * Si storeAccessMode es 'selected', la tienda debe estar en la lista permitida.
 */
function canAccessStore(
	storeId: string,
	storeAccessMode: 'all' | 'selected',
	allowedStoreIds: string[],
): boolean {
	if (storeAccessMode === 'all') return true
	return allowedStoreIds.includes(storeId)
}

export async function $getComplaintDetailAction(
	id: string,
): Promise<GetComplaintDetailResult> {
	const access = await requireAccess('complaints.view')
	if ('error' in access) redirect('/dashboard/complaints')

	const [complaint, auditHistory, history] = await Promise.all([
		getComplaintDetailById(id, access.membership.organizationId),
		getComplaintAuditHistory(id, access.membership.organizationId),
		getComplaintHistory(id, access.membership.organizationId),
	])

	if (!complaint) redirect('/dashboard/complaints')

	if (
		!canAccessStore(
			complaint.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		redirect('/dashboard/complaints')
	}

	return { complaint, auditHistory, history }
}

export interface RespondToComplaintInput {
	id: string
	response: string
}

export async function $saveDraftResponseAction(
	id: string,
	draft: string,
): Promise<{ success: boolean; error?: string }> {
	const access = await requireAccess('complaints.respond')
	if ('error' in access) {
		return {
			success: false,
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const existing = await getComplaintDetailById(
		id,
		access.membership.organizationId,
	)
	if (!existing) return { success: false, error: 'Reclamo no encontrado.' }

	if (
		!canAccessStore(
			existing.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		return { success: false, error: 'No tienes acceso a este reclamo.' }
	}

	if (existing.officialResponse) {
		return {
			success: false,
			error: 'El reclamo ya tiene respuesta oficial.',
		}
	}

	const now = new Date()
	await db
		.update(complaints)
		.set({
			draftResponse: draft || null,
			draftUpdatedAt: now,
			draftSavedBy: access.session.user.id,
		})
		.where(
			and(
				eq(complaints.id, id),
				eq(complaints.organizationId, access.membership.organizationId),
			),
		)

	return { success: true }
}

export interface RespondToComplaintResult {
	success: boolean
	error?: string
}

export async function $respondToComplaintAction(
	input: RespondToComplaintInput,
): Promise<RespondToComplaintResult> {
	const access = await requireAccess('complaints.respond')
	if ('error' in access) {
		return {
			success: false,
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const response = input.response?.trim()
	if (!response) {
		return { success: false, error: 'La respuesta no puede estar vacía' }
	}

	const existing = await getComplaintDetailById(
		input.id,
		access.membership.organizationId,
	)
	if (!existing) {
		return { success: false, error: 'Reclamo no encontrado' }
	}

	// Verificar acceso a la tienda del reclamo
	if (
		!canAccessStore(
			existing.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		return { success: false, error: 'No tienes acceso a este reclamo.' }
	}

	if (existing.officialResponse) {
		return {
			success: false,
			error: 'Este reclamo ya tiene una respuesta registrada',
		}
	}

	const now = new Date()
	const reqHeaders = await headers()
	const ipAddress =
		reqHeaders.get('x-forwarded-for') ?? reqHeaders.get('x-real-ip')
	const userAgent = reqHeaders.get('user-agent')

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(complaints)
				.set({
					officialResponse: response,
					respondedAt: now,
					respondedBy: access.session.user.id,
					status: 'resolved',
					updatedAt: now,
					updatedBy: access.session.user.id,
					// limpiar borrador al registrar respuesta oficial
					draftResponse: null,
					draftUpdatedAt: null,
					draftSavedBy: null,
				})
				.where(
					and(
						eq(complaints.id, input.id),
						eq(
							complaints.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: 'complaint.responded',
					entityType: 'complaint',
					entityId: input.id,
					oldData: {
						status: existing.status,
						officialResponse: null,
					},
					newData: {
						status: 'resolved',
						officialResponse: response,
						respondedAt: now.toISOString(),
					},
					ipAddress,
					userAgent,
				},
				tx,
			)

			await createComplaintHistoryEntry(
				{
					complaintId: input.id,
					eventType: 'response_added',
					fromStatus: existing.status,
					toStatus: 'resolved',
					publicNote:
						'Se registró una respuesta oficial a tu reclamo.',
					performedBy: access.session.user.id,
					performedByRole: 'operator',
				},
				tx,
			)
		})
	} catch {
		return {
			success: false,
			error: 'Error al guardar la respuesta. Intenta de nuevo.',
		}
	}

	return { success: true }
}

const STATUS_CHANGE_NOTE: Record<ChangeableStatus, string> = {
	in_progress: 'Tu reclamo está siendo procesado por nuestro equipo.',
	in_review: 'Tu reclamo está siendo revisado por nuestro equipo.',
	closed: 'Tu reclamo ha sido cerrado.',
}

export interface ChangeComplaintStatusInput {
	id: string
	status: ChangeableStatus
	internalNote?: string
}

export interface ChangeComplaintStatusResult {
	success: boolean
	error?: string
}

export async function $changeComplaintStatusAction(
	input: ChangeComplaintStatusInput,
): Promise<ChangeComplaintStatusResult> {
	const access = await requireAccess('complaints.respond')
	if ('error' in access) {
		return {
			success: false,
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const existing = await getComplaintDetailById(
		input.id,
		access.membership.organizationId,
	)
	if (!existing) return { success: false, error: 'Reclamo no encontrado.' }

	if (
		!canAccessStore(
			existing.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		return { success: false, error: 'No tienes acceso a este reclamo.' }
	}

	if (existing.status === 'resolved') {
		return { success: false, error: 'El reclamo ya fue resuelto.' }
	}

	if (existing.status === input.status) {
		return { success: false, error: 'El reclamo ya tiene ese estado.' }
	}

	const now = new Date()
	const reqHeaders = await headers()

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(complaints)
				.set({
					status: input.status,
					updatedAt: now,
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(complaints.id, input.id),
						eq(
							complaints.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: 'complaint.status_changed',
					entityType: 'complaint',
					entityId: input.id,
					oldData: { status: existing.status },
					newData: { status: input.status },
					ipAddress:
						reqHeaders.get('x-forwarded-for') ??
						reqHeaders.get('x-real-ip'),
					userAgent: reqHeaders.get('user-agent'),
				},
				tx,
			)

			await createComplaintHistoryEntry(
				{
					complaintId: input.id,
					eventType: 'status_changed',
					fromStatus: existing.status,
					toStatus: input.status,
					publicNote: STATUS_CHANGE_NOTE[input.status],
					internalNote: input.internalNote ?? null,
					performedBy: access.session.user.id,
					performedByRole: 'operator',
				},
				tx,
			)
		})
	} catch {
		return {
			success: false,
			error: 'Error al cambiar el estado. Intenta de nuevo.',
		}
	}

	return { success: true }
}

export async function $getAttachmentDownloadUrlAction(
	storageKey: string,
): Promise<{ url: string } | { error: string }> {
	const access = await requireAccess('complaints.view')
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

	const url = await getPresignedDownloadUrl(storageKey)
	return { url }
}
