'use server'

import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import {
	getComplaintByTrackingCode,
	getPublicComplaintHistory,
	type PublicHistoryEntry,
} from '@/modules/complaints/queries'
import { MESSAGES } from '@/modules/shared/messages'

export type TrackingResult = NonNullable<
	Awaited<ReturnType<typeof getComplaintByTrackingCode>>
> & {
	history: PublicHistoryEntry[]
}

export type LookupComplaintResult =
	| { success: true; data: TrackingResult }
	| { success: false; error: string }

export async function lookupComplaintByTrackingCodeAction(
	trackingCode: string,
	organizationId: string,
): Promise<LookupComplaintResult> {
	const clean = trackingCode.trim().toUpperCase()

	if (!clean) {
		return {
			success: false,
			error: MESSAGES.complaints.trackingCodeRequired,
		}
	}

	const complaint = await getComplaintByTrackingCode(clean, organizationId)

	if (!complaint) {
		return {
			success: false,
			error: MESSAGES.complaints.trackingNotFound,
		}
	}

	const history = await getPublicComplaintHistory(complaint.id)

	await createAuditLog({
		organizationId,
		action: AUDIT_LOG.COMPLAINT_TRACKING_VIEWED,
		entityType: 'complaint_tracking',
		entityId: complaint.id,
		newData: {
			trackingCode: complaint.trackingCode,
		},
	})

	return { success: true, data: { ...complaint, history } }
}
