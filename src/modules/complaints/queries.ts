import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	complaintReasons,
	complaints,
	organizations,
	stores,
} from '@/database/schema'

export async function getOrganizationBySlug(slug: string) {
	const [org] = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			logoKey: organizations.logoKey,
			primaryColor: organizations.primaryColor,
		})
		.from(organizations)
		.where(eq(organizations.slug, slug))
		.limit(1)
	return org ?? null
}

export async function getStoreBySlug(slug: string) {
	const [store] = await db
		.select({
			id: stores.id,
			name: stores.name,
			slug: stores.slug,
			organizationId: stores.organizationId,
		})
		.from(stores)
		.where(eq(stores.slug, slug))
		.limit(1)
	return store ?? null
}

export async function getStoresByOrganizationId(organizationId: string) {
	return db
		.select({
			id: stores.id,
			name: stores.name,
			slug: stores.slug,
		})
		.from(stores)
		.where(eq(stores.organizationId, organizationId))
}

export async function getComplaintReasonsForOrg(organizationId: string) {
	return db
		.select({
			id: complaintReasons.id,
			reason: complaintReasons.reason,
			parentId: complaintReasons.parentId,
		})
		.from(complaintReasons)
		.where(
			and(
				eq(complaintReasons.organizationId, organizationId),
				isNull(complaintReasons.deletedAt),
			),
		)
}

export async function getOrganizationById(id: string) {
	const [org] = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			logoKey: organizations.logoKey,
			primaryColor: organizations.primaryColor,
		})
		.from(organizations)
		.where(eq(organizations.id, id))
		.limit(1)
	return org ?? null
}

export async function getNextCorrelative(storeId: string): Promise<string> {
	const year = new Date().getFullYear()
	const [result] = await db
		.select({ total: count() })
		.from(complaints)
		.where(eq(complaints.storeId, storeId))

	const next = (result?.total ?? 0) + 1
	return `${year}-${String(next).padStart(4, '0')}`
}

export async function getComplaintByTrackingCode(
	trackingCode: string,
	organizationId: string,
) {
	const [result] = await db
		.select({
			trackingCode: complaints.trackingCode,
			correlative: complaints.correlative,
			status: complaints.status,
			type: complaints.type,
			storeName: stores.name,
			createdAt: complaints.createdAt,
			responseDeadline: complaints.responseDeadline,
			updatedAt: complaints.updatedAt,
		})
		.from(complaints)
		.innerJoin(stores, eq(complaints.storeId, stores.id))
		.where(
			and(
				eq(complaints.trackingCode, trackingCode),
				eq(complaints.organizationId, organizationId),
			),
		)
		.limit(1)
	return result ?? null
}
