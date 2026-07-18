import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/database/database'
import { complaintReasons } from '@/database/schema'

export async function getReasonsForOrg(organizationId: string) {
	return db
		.select({
			id: complaintReasons.id,
			reason: complaintReasons.reason,
			parentId: complaintReasons.parentId,
			organizationId: complaintReasons.organizationId,
			createdAt: complaintReasons.createdAt,
			updatedAt: complaintReasons.updatedAt,
		})
		.from(complaintReasons)
		.where(
			and(
				eq(complaintReasons.organizationId, organizationId),
				isNull(complaintReasons.deletedAt),
			),
		)
}
