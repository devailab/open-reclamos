import { db } from '@/database/database'
import { complaintHistory } from '@/database/schema'

export interface CreateHistoryEntryInput {
	complaintId: string
	eventType: string
	fromStatus?: string | null
	toStatus?: string | null
	publicNote?: string | null
	internalNote?: string | null
	performedBy?: string | null
	performedByRole?: 'system' | 'consumer' | 'operator'
}

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function createComplaintHistoryEntry(
	input: CreateHistoryEntryInput,
	tx?: DbOrTx,
) {
	const executor = tx ?? db
	await executor.insert(complaintHistory).values({
		complaintId: input.complaintId,
		eventType: input.eventType,
		fromStatus: input.fromStatus ?? null,
		toStatus: input.toStatus ?? null,
		publicNote: input.publicNote ?? null,
		internalNote: input.internalNote ?? null,
		performedBy: input.performedBy ?? null,
		performedByRole: input.performedByRole ?? 'system',
	})
}
