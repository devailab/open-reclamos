'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import {
	complaintCategories,
	complaintDetails,
	complaints,
} from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { getPresignedDownloadUrl } from '@/lib/s3'
import { WEBHOOK_EVENT } from '@/lib/webhook-events'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import { dispatchWebhookEvent } from '@/modules/webhooks/dispatch'
import {
	enqueueComplaintResponseDelivery,
	getComplaintDeliveryFailure,
	setComplaintDeliveryStatus,
} from './delivery'
import {
	type ComplaintAuditEntry,
	type ComplaintCategorySummary,
	type ComplaintDetail,
	type ComplaintHistoryEntry,
	getAttachmentByStorageKey,
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

const COMPLAINT_PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const

type ComplaintPriority = (typeof COMPLAINT_PRIORITY_VALUES)[number]

function isComplaintPriority(value: string): value is ComplaintPriority {
	return COMPLAINT_PRIORITY_VALUES.includes(value as ComplaintPriority)
}

async function getComplaintCategoryForOrganization(params: {
	categoryId: string | null
	organizationId: string
}) {
	if (!params.categoryId) {
		return null
	}

	const [category] = await db
		.select({
			id: complaintCategories.id,
			name: complaintCategories.name,
			description: complaintCategories.description,
		})
		.from(complaintCategories)
		.where(
			and(
				eq(complaintCategories.id, params.categoryId),
				eq(complaintCategories.organizationId, params.organizationId),
			),
		)
		.limit(1)

	return category ?? null
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
	priority: ComplaintPriority
	categoryId: string | null
}

export interface UpdateComplaintClassificationInput {
	id: string
	priority: ComplaintPriority
	categoryId: string | null
}

export interface UpdateComplaintClassificationResult {
	success: boolean
	data?: {
		priority: ComplaintPriority
		category: ComplaintCategorySummary | null
	}
	error?: string
}

export async function $saveDraftResponseAction(
	id: string,
	draft: string,
): Promise<{ success: boolean; error?: string }> {
	const access = await requireAccess('complaints.respond')
	if ('error' in access) {
		return {
			success: false,
			error: access.error,
		}
	}

	const existing = await getComplaintDetailById(
		id,
		access.membership.organizationId,
	)
	if (!existing)
		return { success: false, error: MESSAGES.complaints.notFound }

	if (
		!canAccessStore(
			existing.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		return { success: false, error: MESSAGES.complaints.noAccess }
	}

	if (existing.officialResponse) {
		return {
			success: false,
			error: MESSAGES.complaints.alreadyHasResponse,
		}
	}

	const now = new Date()
	await db
		.insert(complaintDetails)
		.values({
			organizationId: access.membership.organizationId,
			complaintId: id,
			draftResponse: draft || null,
			draftUpdatedAt: now,
			draftSavedBy: access.session.user.id,
		})
		.onConflictDoUpdate({
			target: complaintDetails.complaintId,
			set: {
				organizationId: access.membership.organizationId,
				draftResponse: draft || null,
				draftUpdatedAt: now,
				draftSavedBy: access.session.user.id,
				updatedAt: now,
			},
		})

	return { success: true }
}

export async function $updateComplaintClassificationAction(
	input: UpdateComplaintClassificationInput,
): Promise<UpdateComplaintClassificationResult> {
	const access = await requireAccess('complaints.respond')
	if ('error' in access) {
		return {
			success: false,
			error: access.error,
		}
	}

	if (!isComplaintPriority(input.priority)) {
		return {
			success: false,
			error: MESSAGES.complaints.invalidPriority,
		}
	}

	const existing = await getComplaintDetailById(
		input.id,
		access.membership.organizationId,
	)
	if (!existing) {
		return { success: false, error: MESSAGES.complaints.notFound }
	}

	if (
		!canAccessStore(
			existing.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		return { success: false, error: MESSAGES.complaints.noAccess }
	}

	const category = await getComplaintCategoryForOrganization({
		categoryId: input.categoryId,
		organizationId: access.membership.organizationId,
	})
	if (input.categoryId && !category) {
		return {
			success: false,
			error: MESSAGES.complaints.invalidCategory,
		}
	}

	try {
		const data = await db.transaction(async (tx) => {
			await tx
				.update(complaints)
				.set({
					priority: input.priority,
					categoryId: input.categoryId,
					updatedAt: new Date(),
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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.COMPLAINT_UPDATED,
				entityType: 'complaint',
				entityId: input.id,
				oldData: {
					priority: existing.priority,
					categoryId: existing.categoryId,
				},
				newData: {
					priority: input.priority,
					categoryId: input.categoryId,
				},
			})

			return {
				priority: input.priority,
				category,
			}
		})

		return { success: true, data }
	} catch (error) {
		console.error(
			'[complaints] Error al actualizar prioridad o categoría del reclamo:',
			error,
		)
		return {
			success: false,
			error: MESSAGES.complaints.priorityCategorySaveFailed,
		}
	}
}

export interface RespondToComplaintResult {
	success: boolean
	data?: {
		response: string
		respondedAt: string
		respondedByName: string | null
		publicNote: string
		priority: ComplaintPriority
		category: ComplaintCategorySummary | null
	}
	error?: string
}

export async function $respondToComplaintAction(
	input: RespondToComplaintInput,
): Promise<RespondToComplaintResult> {
	const access = await requireAccess('complaints.respond')
	if ('error' in access) {
		return {
			success: false,
			error: access.error,
		}
	}

	const response = input.response?.trim()
	if (!response) {
		return { success: false, error: MESSAGES.complaints.responseEmpty }
	}

	if (!isComplaintPriority(input.priority)) {
		return {
			success: false,
			error: MESSAGES.complaints.invalidPriority,
		}
	}

	const existing = await getComplaintDetailById(
		input.id,
		access.membership.organizationId,
	)
	if (!existing) {
		return { success: false, error: MESSAGES.complaints.notFoundShort }
	}

	// Verificar acceso a la tienda del reclamo
	if (
		!canAccessStore(
			existing.storeId,
			access.membership.storeAccessMode,
			access.membership.storeIds,
		)
	) {
		return { success: false, error: MESSAGES.complaints.noAccess }
	}

	if (existing.officialResponse) {
		return {
			success: false,
			error: MESSAGES.complaints.alreadyHasResponseRegistered,
		}
	}

	const now = new Date()
	const reqHeaders = await headers()
	const ipAddress =
		reqHeaders.get('x-forwarded-for') ?? reqHeaders.get('x-real-ip')
	const userAgent = reqHeaders.get('user-agent')
	const publicNote = 'Se registró una respuesta oficial a tu reclamo.'
	const category = await getComplaintCategoryForOrganization({
		categoryId: input.categoryId,
		organizationId: access.membership.organizationId,
	})
	if (input.categoryId && !category) {
		return {
			success: false,
			error: MESSAGES.complaints.invalidCategory,
		}
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.insert(complaintDetails)
				.values({
					organizationId: access.membership.organizationId,
					complaintId: input.id,
					officialResponse: response,
					respondedAt: now,
					respondedBy: access.session.user.id,
					draftResponse: null,
					draftUpdatedAt: null,
					draftSavedBy: null,
				})
				.onConflictDoUpdate({
					target: complaintDetails.complaintId,
					set: {
						organizationId: access.membership.organizationId,
						officialResponse: response,
						respondedAt: now,
						respondedBy: access.session.user.id,
						draftResponse: null,
						draftUpdatedAt: null,
						draftSavedBy: null,
						updatedAt: now,
					},
				})

			await tx
				.update(complaints)
				.set({
					status: 'resolved',
					priority: input.priority,
					categoryId: input.categoryId,
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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.COMPLAINT_RESPONDED,
				entityType: 'complaint',
				entityId: input.id,
				oldData: {
					status: existing.status,
					priority: existing.priority,
					categoryId: existing.categoryId,
					officialResponse: null,
				},
				newData: {
					status: 'resolved',
					priority: input.priority,
					categoryId: input.categoryId,
					officialResponse: response,
					respondedAt: now.toISOString(),
				},
				ipAddress,
				userAgent,
			})

			await createComplaintHistoryEntry(
				{
					complaintId: input.id,
					eventType: 'response_added',
					fromStatus: existing.status,
					toStatus: 'resolved',
					publicNote,
					performedBy: access.session.user.id,
					performedByRole: 'operator',
				},
				tx,
			)

			await setComplaintDeliveryStatus(
				{
					complaintId: input.id,
					organizationId: access.membership.organizationId,
					workflow: 'response',
					status: 'queued',
				},
				tx,
			)
		})
	} catch (error) {
		console.error('[complaints] Error al responder reclamo:', error)
		return {
			success: false,
			error: MESSAGES.complaints.responseSaveFailed,
		}
	}

	try {
		await enqueueComplaintResponseDelivery({
			complaintId: input.id,
			organizationId: access.membership.organizationId,
		})
	} catch (error) {
		console.error(
			'[complaints] No se pudo encolar el envío de respuesta:',
			error,
		)

		const failure = getComplaintDeliveryFailure({
			workflow: 'response',
			error,
		})

		await setComplaintDeliveryStatus({
			complaintId: input.id,
			organizationId: access.membership.organizationId,
			workflow: 'response',
			status: 'failed',
			failureMessage: failure.technicalMessage,
		})
	}

	try {
		await dispatchWebhookEvent({
			organizationId: access.membership.organizationId,
			eventKey: WEBHOOK_EVENT.COMPLAINT_RESPONDED,
			entityType: 'complaint',
			entityId: input.id,
			payload: { status: 'resolved', respondedAt: now.toISOString() },
		})
	} catch (error) {
		console.error(
			'[webhooks] No se pudo disparar complaint.responded:',
			error,
		)
	}

	return {
		success: true,
		data: {
			response,
			respondedAt: now.toISOString(),
			respondedByName: access.session.user.name ?? null,
			publicNote,
			priority: input.priority,
			category,
		},
	}
}

export async function $getAttachmentDownloadUrlAction(
	storageKey: string,
): Promise<{ url: string } | { error: string }> {
	const access = await requireAccess('complaints.view')
	if ('error' in access)
		return {
			error: access.error,
		}

	const attachment = await getAttachmentByStorageKey(
		storageKey,
		access.membership.organizationId,
	)
	if (!attachment) {
		return { error: MESSAGES.complaints.attachmentNotFound }
	}

	// Respetar la restricción de tiendas del miembro
	if (
		access.membership.storeAccessMode === 'selected' &&
		!access.membership.storeIds.includes(attachment.storeId)
	) {
		return { error: MESSAGES.complaints.attachmentNotFound }
	}

	const url = await getPresignedDownloadUrl(storageKey)
	return { url }
}
