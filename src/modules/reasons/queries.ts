import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/database/database'
import { complaintReasons, organizationMembers } from '@/database/schema'

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

export async function getOrganizationForUser(userId: string) {
	const [membership] = await db
		.select({ organizationId: organizationMembers.organizationId })
		.from(organizationMembers)
		.where(eq(organizationMembers.userId, userId))
		.limit(1)
	return membership?.organizationId ?? null
}
