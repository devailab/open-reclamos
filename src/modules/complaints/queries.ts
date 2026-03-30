import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	complaintHistory,
	complaintReasons,
	complaints,
	organizationSettings,
	organizations,
	stores,
	ubigeos,
} from '@/database/schema'
import { DEFAULT_RESPONSE_DEADLINE_DAYS } from '@/lib/constants'

export async function getOrganizationBySlug(slug: string) {
	const [org] = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			logoKey: organizations.logoKey,
			primaryColor: organizations.primaryColor,
			formEnabled: organizationSettings.formEnabled,
			responseDeadlineDays: organizationSettings.responseDeadlineDays,
		})
		.from(organizations)
		.leftJoin(
			organizationSettings,
			eq(organizationSettings.organizationId, organizations.id),
		)
		.where(eq(organizations.slug, slug))
		.limit(1)

	if (!org) return null

	return {
		...org,
		formEnabled: org.formEnabled ?? true,
		responseDeadlineDays:
			org.responseDeadlineDays ?? DEFAULT_RESPONSE_DEADLINE_DAYS,
	}
}

export async function getStoreBySlug(slug: string) {
	const [store] = await db
		.select({
			id: stores.id,
			name: stores.name,
			slug: stores.slug,
			organizationId: stores.organizationId,
			formEnabled: stores.formEnabled,
			deletedAt: stores.deletedAt,
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
				eq(stores.formEnabled, true),
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
				eq(stores.formEnabled, true),
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
			formEnabled: organizationSettings.formEnabled,
			responseDeadlineDays: organizationSettings.responseDeadlineDays,
		})
		.from(organizations)
		.leftJoin(
			organizationSettings,
			eq(organizationSettings.organizationId, organizations.id),
		)
		.where(eq(organizations.id, id))
		.limit(1)

	if (!org) return null

	return {
		...org,
		formEnabled: org.formEnabled ?? true,
		responseDeadlineDays:
			org.responseDeadlineDays ?? DEFAULT_RESPONSE_DEADLINE_DAYS,
	}
}

export interface ComplaintReceiptContext {
	organization: {
		name: string
		legalName: string
		taxId: string
		addressType: string
		address: string
		locationLabel: string | null
		phoneCode: string | null
		phone: string | null
		website: string | null
		primaryColor: string | null
	}
	store: {
		name: string
		type: string
		addressType: string | null
		address: string | null
		url: string | null
		locationLabel: string | null
	}
	reasonLabel: string | null
	consumerLocationLabel: string | null
}

function formatUbigeoLabel(
	ubigeo: {
		district: string | null
		province: string | null
		department: string | null
	} | null,
) {
	if (!ubigeo?.district || !ubigeo.province || !ubigeo.department) {
		return null
	}

	return `${ubigeo.district}, ${ubigeo.province}, ${ubigeo.department}`
}

export async function getComplaintReceiptContext(params: {
	organizationId: string
	storeId: string
	reasonId: string | null
	consumerUbigeoId: string | null
}): Promise<ComplaintReceiptContext | null> {
	const [organization, store, reason, consumerUbigeo] = await Promise.all([
		db
			.select({
				name: organizations.name,
				legalName: organizations.legalName,
				taxId: organizations.taxId,
				addressType: organizations.addressType,
				address: organizations.address,
				phoneCode: organizations.phoneCode,
				phone: organizations.phone,
				website: organizations.website,
				primaryColor: organizations.primaryColor,
				district: ubigeos.district,
				province: ubigeos.province,
				department: ubigeos.department,
			})
			.from(organizations)
			.leftJoin(ubigeos, eq(organizations.ubigeoId, ubigeos.id))
			.where(eq(organizations.id, params.organizationId))
			.limit(1),
		db
			.select({
				name: stores.name,
				type: stores.type,
				addressType: stores.addressType,
				address: stores.address,
				url: stores.url,
				district: ubigeos.district,
				province: ubigeos.province,
				department: ubigeos.department,
			})
			.from(stores)
			.leftJoin(ubigeos, eq(stores.ubigeoId, ubigeos.id))
			.where(
				and(
					eq(stores.id, params.storeId),
					eq(stores.organizationId, params.organizationId),
					isNull(stores.deletedAt),
				),
			)
			.limit(1),
		params.reasonId
			? db
					.select({
						reason: complaintReasons.reason,
					})
					.from(complaintReasons)
					.where(
						and(
							eq(complaintReasons.id, params.reasonId),
							eq(
								complaintReasons.organizationId,
								params.organizationId,
							),
							isNull(complaintReasons.deletedAt),
						),
					)
					.limit(1)
			: Promise.resolve([]),
		params.consumerUbigeoId
			? db
					.select({
						district: ubigeos.district,
						province: ubigeos.province,
						department: ubigeos.department,
					})
					.from(ubigeos)
					.where(eq(ubigeos.id, params.consumerUbigeoId))
					.limit(1)
			: Promise.resolve([]),
	])

	const orgRow = organization[0]
	const storeRow = store[0]
	const reasonRow = reason[0]
	const consumerUbigeoRow = consumerUbigeo[0]

	if (!orgRow || !storeRow) return null

	return {
		organization: {
			name: orgRow.name,
			legalName: orgRow.legalName,
			taxId: orgRow.taxId,
			addressType: orgRow.addressType,
			address: orgRow.address,
			locationLabel: formatUbigeoLabel(orgRow),
			phoneCode: orgRow.phoneCode,
			phone: orgRow.phone,
			website: orgRow.website,
			primaryColor: orgRow.primaryColor,
		},
		store: {
			name: storeRow.name,
			type: storeRow.type,
			addressType: storeRow.addressType,
			address: storeRow.address,
			url: storeRow.url,
			locationLabel: formatUbigeoLabel(storeRow),
		},
		reasonLabel: reasonRow?.reason ?? null,
		consumerLocationLabel: formatUbigeoLabel(consumerUbigeoRow ?? null),
	}
}

export async function getComplaintByTrackingCode(
	trackingCode: string,
	organizationId: string,
) {
	const [result] = await db
		.select({
			id: complaints.id,
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

export interface PublicHistoryEntry {
	eventType: string
	toStatus: string | null
	publicNote: string | null
	performedByRole: string
	createdAt: Date
}

export async function getPublicComplaintHistory(
	complaintId: string,
): Promise<PublicHistoryEntry[]> {
	return db
		.select({
			eventType: complaintHistory.eventType,
			toStatus: complaintHistory.toStatus,
			publicNote: complaintHistory.publicNote,
			performedByRole: complaintHistory.performedByRole,
			createdAt: complaintHistory.createdAt,
		})
		.from(complaintHistory)
		.where(eq(complaintHistory.complaintId, complaintId))
		.orderBy(asc(complaintHistory.createdAt))
}
