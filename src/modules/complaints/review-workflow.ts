import 'server-only'

import { and, eq } from 'drizzle-orm'
import { db } from '@/database/database'
import { complaints } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { createComplaintHistoryEntry } from './history'

const REVIEW_STARTED_NOTE =
	'Tu reclamo está siendo revisado por nuestro equipo.'

interface StartComplaintReviewInput {
	complaintId: string
	organizationId: string
	storeId: string
	userId: string
	ipAddress: string | null
	userAgent: string | null
}

export interface StartComplaintReviewResult {
	transitioned: boolean
	updatedAt: Date | null
}

export async function startComplaintReview(
	input: StartComplaintReviewInput,
): Promise<StartComplaintReviewResult> {
	const now = new Date()
	let transitioned = false

	try {
		transitioned = await db.transaction(async (tx) => {
			const [updated] = await tx
				.update(complaints)
				.set({
					status: 'in_review',
					updatedAt: now,
					updatedBy: input.userId,
				})
				.where(
					and(
						eq(complaints.id, input.complaintId),
						eq(complaints.organizationId, input.organizationId),
						eq(complaints.storeId, input.storeId),
						eq(complaints.status, 'open'),
					),
				)
				.returning({ id: complaints.id })

			if (!updated) return false

			await createComplaintHistoryEntry(
				{
					complaintId: input.complaintId,
					eventType: 'status_changed',
					fromStatus: 'open',
					toStatus: 'in_review',
					publicNote: REVIEW_STARTED_NOTE,
					performedBy: input.userId,
					performedByRole: 'operator',
				},
				tx,
			)

			return true
		})
	} catch (error) {
		console.error(
			'[complaints] No se pudo iniciar automáticamente la revisión:',
			error,
		)
		return { transitioned: false, updatedAt: null }
	}

	if (!transitioned) {
		return { transitioned: false, updatedAt: null }
	}

	await createAuditLog({
		organizationId: input.organizationId,
		userId: input.userId,
		action: AUDIT_LOG.COMPLAINT_STATUS_CHANGED,
		entityType: 'complaint',
		entityId: input.complaintId,
		oldData: { status: 'open' },
		newData: { status: 'in_review' },
		ipAddress: input.ipAddress,
		userAgent: input.userAgent,
	})

	return { transitioned: true, updatedAt: now }
}
