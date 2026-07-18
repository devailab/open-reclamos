import { and, count, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	complaintDetails,
	complaintReasons,
	complaints,
	stores,
} from '@/database/schema'
import { countRows } from '@/modules/shared/queries'

export interface McpComplaintRow {
	id: string
	correlative: string
	trackingCode: string
	type: string
	status: string
	priority: string
	firstName: string
	lastName: string
	documentType: string
	documentNumber: string
	email: string
	phone: string | null
	address: string | null
	storeName: string
	storeId: string
	reasonId: string | null
	description: string | null
	request: string | null
	responseDeadline: Date | null
	officialResponse: string | null
	respondedAt: Date | null
	guardianFirstName: string | null
	guardianLastName: string | null
	guardianDocumentType: string | null
	guardianDocumentNumber: string | null
	createdAt: Date
}

export interface McpComplaintsResult {
	rows: McpComplaintRow[]
	total: number
	page: number
	pageSize: number
	totalPages: number
}

export interface McpComplaintsParams {
	page?: number
	pageSize?: number
	status?: string
	type?: string
	storeId?: string
	search?: string
}

// `allowedStoreIds`: undefined = todas las tiendas; lista = solo las asignadas
function buildStoreAccessCondition(allowedStoreIds: string[] | undefined) {
	if (allowedStoreIds === undefined) return null
	if (allowedStoreIds.length === 0) return sql`false`
	return inArray(complaints.storeId, allowedStoreIds)
}

export async function getComplaintsForMcp(
	organizationId: string,
	params: McpComplaintsParams,
	allowedStoreIds?: string[],
): Promise<McpComplaintsResult> {
	const page = Math.max(1, params.page ?? 1)
	const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20))
	const offset = (page - 1) * pageSize

	const conditions = [eq(complaints.organizationId, organizationId)]

	const storeAccessCondition = buildStoreAccessCondition(allowedStoreIds)
	if (storeAccessCondition) {
		conditions.push(storeAccessCondition as ReturnType<typeof eq>)
	}

	if (params.search?.trim()) {
		const term = `%${params.search.trim()}%`
		conditions.push(
			or(
				ilike(complaints.correlative, term),
				ilike(complaints.trackingCode, term),
				ilike(complaints.firstName, term),
				ilike(complaints.lastName, term),
			) as ReturnType<typeof eq>,
		)
	}

	if (params.status && params.status !== 'all') {
		conditions.push(eq(complaints.status, params.status))
	}

	if (params.type && params.type !== 'all') {
		conditions.push(eq(complaints.type, params.type))
	}

	if (params.storeId) {
		conditions.push(eq(complaints.storeId, params.storeId))
	}

	const where = and(...conditions)

	const [rows, total] = await Promise.all([
		db
			.select({
				id: complaints.id,
				correlative: complaints.correlative,
				trackingCode: complaints.trackingCode,
				type: complaints.type,
				status: complaints.status,
				priority: complaints.priority,
				firstName: complaints.firstName,
				lastName: complaints.lastName,
				documentType: complaints.documentType,
				documentNumber: complaints.documentNumber,
				email: complaints.email,
				phone: complaints.phone,
				address: complaints.address,
				storeName: stores.name,
				storeId: complaints.storeId,
				reasonId: complaints.reasonId,
				description: complaints.description,
				request: complaints.request,
				responseDeadline: complaints.responseDeadline,
				officialResponse: complaintDetails.officialResponse,
				respondedAt: complaintDetails.respondedAt,
				guardianFirstName: complaints.guardianFirstName,
				guardianLastName: complaints.guardianLastName,
				guardianDocumentType: complaints.guardianDocumentType,
				guardianDocumentNumber: complaints.guardianDocumentNumber,
				createdAt: complaints.createdAt,
			})
			.from(complaints)
			.innerJoin(stores, eq(complaints.storeId, stores.id))
			.leftJoin(
				complaintDetails,
				eq(complaintDetails.complaintId, complaints.id),
			)
			.where(where)
			.orderBy(sql`${complaints.createdAt} desc`)
			.limit(pageSize)
			.offset(offset),
		countRows(complaints, where),
	])

	return {
		rows,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	}
}

export async function getComplaintByTrackingCodeForMcp(
	organizationId: string,
	trackingCode: string,
	allowedStoreIds?: string[],
): Promise<McpComplaintRow | null> {
	const storeAccessCondition = buildStoreAccessCondition(allowedStoreIds)
	const [row] = await db
		.select({
			id: complaints.id,
			correlative: complaints.correlative,
			trackingCode: complaints.trackingCode,
			type: complaints.type,
			status: complaints.status,
			priority: complaints.priority,
			firstName: complaints.firstName,
			lastName: complaints.lastName,
			documentType: complaints.documentType,
			documentNumber: complaints.documentNumber,
			email: complaints.email,
			phone: complaints.phone,
			address: complaints.address,
			storeName: stores.name,
			storeId: complaints.storeId,
			reasonId: complaints.reasonId,
			description: complaints.description,
			request: complaints.request,
			responseDeadline: complaints.responseDeadline,
			officialResponse: complaintDetails.officialResponse,
			respondedAt: complaintDetails.respondedAt,
			guardianFirstName: complaints.guardianFirstName,
			guardianLastName: complaints.guardianLastName,
			guardianDocumentType: complaints.guardianDocumentType,
			guardianDocumentNumber: complaints.guardianDocumentNumber,
			createdAt: complaints.createdAt,
		})
		.from(complaints)
		.innerJoin(stores, eq(complaints.storeId, stores.id))
		.leftJoin(
			complaintDetails,
			eq(complaintDetails.complaintId, complaints.id),
		)
		.where(
			and(
				eq(complaints.trackingCode, trackingCode),
				eq(complaints.organizationId, organizationId),
				...(storeAccessCondition ? [storeAccessCondition] : []),
			),
		)
		.limit(1)

	return row ?? null
}

export interface McpStoreRow {
	id: string
	name: string
	slug: string
	type: string
	formEnabled: boolean
}

export async function getStoresForMcp(
	organizationId: string,
	allowedStoreIds?: string[],
): Promise<McpStoreRow[]> {
	if (allowedStoreIds !== undefined && allowedStoreIds.length === 0) {
		return []
	}

	return db
		.select({
			id: stores.id,
			name: stores.name,
			slug: stores.slug,
			type: stores.type,
			formEnabled: stores.formEnabled,
		})
		.from(stores)
		.where(
			and(
				eq(stores.organizationId, organizationId),
				isNull(stores.deletedAt),
				...(allowedStoreIds !== undefined
					? [inArray(stores.id, allowedStoreIds)]
					: []),
			),
		)
		.orderBy(stores.name)
}

export interface McpComplaintReasonRow {
	id: string
	reason: string
	parentId: string | null
	organizationId: string | null
}

export async function getComplaintReasonsForMcp(
	organizationId: string,
): Promise<McpComplaintReasonRow[]> {
	return db
		.select({
			id: complaintReasons.id,
			reason: complaintReasons.reason,
			parentId: complaintReasons.parentId,
			organizationId: complaintReasons.organizationId,
		})
		.from(complaintReasons)
		.where(
			and(
				or(
					isNull(complaintReasons.organizationId),
					eq(complaintReasons.organizationId, organizationId),
				),
				isNull(complaintReasons.deletedAt),
			),
		)
		.orderBy(complaintReasons.reason)
}

export interface McpOrganizationStats {
	total: number
	open: number
	inReview: number
	resolved: number
	overdue: number
}

export async function getOrganizationStatsForMcp(
	organizationId: string,
	allowedStoreIds?: string[],
): Promise<McpOrganizationStats> {
	const storeAccessCondition = buildStoreAccessCondition(allowedStoreIds)
	const [summary] = await db
		.select({
			total: count(),
			open: sql<number>`count(*) filter (where ${complaints.status} = 'open')`,
			inReview: sql<number>`count(*) filter (where ${complaints.status} = 'in_review')`,
			resolved: sql<number>`count(*) filter (where ${complaints.status} = 'resolved')`,
			overdue: sql<number>`count(*) filter (
				where ${complaints.status} in ('open', 'in_review', 'in_progress')
				and ${complaints.responseDeadline} is not null
				and ${complaints.responseDeadline} < now()
			)`,
		})
		.from(complaints)
		.where(
			and(
				eq(complaints.organizationId, organizationId),
				...(storeAccessCondition ? [storeAccessCondition] : []),
			),
		)

	return {
		total: Number(summary?.total ?? 0),
		open: Number(summary?.open ?? 0),
		inReview: Number(summary?.inReview ?? 0),
		resolved: Number(summary?.resolved ?? 0),
		overdue: Number(summary?.overdue ?? 0),
	}
}
