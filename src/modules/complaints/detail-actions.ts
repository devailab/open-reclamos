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
import {
	type ComplaintAuditEntry,
	type ComplaintDetail,
	getComplaintAuditHistory,
	getComplaintDetailById,
} from './detail-queries'

export interface GetComplaintDetailResult {
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
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

	const [complaint, auditHistory] = await Promise.all([
		getComplaintDetailById(id, access.membership.organizationId),
		getComplaintAuditHistory(id, access.membership.organizationId),
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

	return { complaint, auditHistory }
}

export interface RespondToComplaintInput {
	id: string
	response: string
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
		})
	} catch {
		return {
			success: false,
			error: 'Error al guardar la respuesta. Intenta de nuevo.',
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
