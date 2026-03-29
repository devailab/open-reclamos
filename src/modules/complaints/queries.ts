import { and, eq, isNull } from 'drizzle-orm'
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

export async function getStoreForOrganization(
	storeId: string,
	organizationId: string,
) {
	const [store] = await db
		.select({ id: stores.id })
		.from(stores)
		.where(
			and(
				eq(stores.id, storeId),
				eq(stores.organizationId, organizationId),
				isNull(stores.deletedAt),
			),
		)
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
		.where(
			and(
				eq(stores.organizationId, organizationId),
				isNull(stores.deletedAt),
			),
		)
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
