import {
	eachDayOfInterval,
	endOfDay,
	format,
	startOfDay,
	subDays,
} from 'date-fns'
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	or,
	type SQL,
	sql,
} from 'drizzle-orm'
import { db } from '@/database/database'
import {
	complaints,
	complaintTagAssignments,
	complaintTags,
	stores,
} from '@/database/schema'
import type {
	ComplaintsTableFilters,
	DashboardTrendDays,
	DashboardTrendPoint,
} from './dashboard-validation'

export interface ComplaintTagSummary {
	id: string
	name: string
	color: string | null
}

export interface ComplaintTableRow {
	id: string
	correlative: string
	type: string
	firstName: string
	lastName: string
	storeId: string
	storeName: string
	status: string
	priority: string
	tags: ComplaintTagSummary[]
	responseDeadline: Date | null
	hasResponse: boolean
	createdAt: Date
}

export interface StoreOption {
	id: string
	name: string
}

export interface ComplaintsDashboardKpis {
	total: number
	open: number
	inReview: number
	resolved: number
	overdue: number
}

interface GetComplaintsTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: ComplaintsTableFilters
	/** Cuando está definido, solo se devuelven reclamos de estas tiendas. */
	allowedStoreIds?: string[]
}

function parseComplaintTags(value: unknown): ComplaintTagSummary[] {
	if (Array.isArray(value)) {
		return value as ComplaintTagSummary[]
	}

	if (typeof value === 'string') {
		try {
			return JSON.parse(value) as ComplaintTagSummary[]
		} catch {
			return []
		}
	}

	return []
}

const buildComplaintsTableConditions = (
	organizationId: string,
	filters: ComplaintsTableFilters,
	allowedStoreIds?: string[],
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		eq(complaints.organizationId, organizationId),
	]

	if (allowedStoreIds !== undefined) {
		if (allowedStoreIds.length === 0) {
			// El usuario no tiene acceso a ninguna tienda — no debe ver nada.
			conditions.push(sql`false`)
		} else {
			conditions.push(inArray(complaints.storeId, allowedStoreIds))
		}
	}

	if (filters.search.trim()) {
		const term = `%${filters.search.trim()}%`
		conditions.push(
			or(
				ilike(complaints.correlative, term),
				ilike(complaints.firstName, term),
				ilike(complaints.lastName, term),
			) as SQL<unknown>,
		)
	}

	if (filters.type !== 'all') {
		conditions.push(eq(complaints.type, filters.type))
	}

	if (filters.status !== 'all') {
		conditions.push(eq(complaints.status, filters.status))
	}

	if (filters.storeId !== 'all') {
		conditions.push(eq(complaints.storeId, filters.storeId))
	}

	return conditions
}

export async function getComplaintsTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
	allowedStoreIds,
}: GetComplaintsTableForOrganizationParams): Promise<{
	rows: ComplaintTableRow[]
	totalItems: number
}> {
	const whereClause = and(
		...buildComplaintsTableConditions(
			organizationId,
			filters,
			allowedStoreIds,
		),
	)

	if (!whereClause) {
		return { rows: [], totalItems: 0 }
	}

	const offset = (page - 1) * pageSize
	const complaintTagsAggregate = db
		.select({
			complaintId: complaintTagAssignments.complaintId,
			tags: sql<ComplaintTagSummary[]>`
				coalesce(
					json_agg(
						json_build_object(
							'id', ${complaintTags.id},
							'name', ${complaintTags.name},
							'color', ${complaintTags.color}
						)
						order by ${complaintTags.name}
					),
					'[]'::json
				)
			`
				.mapWith(parseComplaintTags)
				.as('tags'),
		})
		.from(complaintTagAssignments)
		.innerJoin(
			complaintTags,
			eq(complaintTagAssignments.tagId, complaintTags.id),
		)
		.groupBy(complaintTagAssignments.complaintId)
		.as('complaint_tags_aggregate')

	const rows = await db
		.select({
			id: complaints.id,
			correlative: complaints.correlative,
			type: complaints.type,
			firstName: complaints.firstName,
			lastName: complaints.lastName,
			storeId: complaints.storeId,
			storeName: stores.name,
			status: complaints.status,
			priority: complaints.priority,
			tags: sql<ComplaintTagSummary[]>`
				coalesce(${complaintTagsAggregate.tags}, '[]'::json)
			`.mapWith(parseComplaintTags),
			responseDeadline: complaints.responseDeadline,
			hasResponse: sql<boolean>`${complaints.officialResponse} IS NOT NULL`,
			createdAt: complaints.createdAt,
		})
		.from(complaints)
		.innerJoin(stores, eq(complaints.storeId, stores.id))
		.leftJoin(
			complaintTagsAggregate,
			eq(complaintTagsAggregate.complaintId, complaints.id),
		)
		.where(whereClause)
		.orderBy(desc(complaints.createdAt))
		.limit(pageSize)
		.offset(offset)

	const [total] = await db
		.select({ total: count() })
		.from(complaints)
		.where(whereClause)

	return {
		rows,
		totalItems: total?.total ?? 0,
	}
}

export async function getStoreOptionsForOrganization(
	organizationId: string,
	allowedStoreIds?: string[],
): Promise<StoreOption[]> {
	const condition =
		allowedStoreIds !== undefined && allowedStoreIds.length > 0
			? and(
					eq(stores.organizationId, organizationId),
					inArray(stores.id, allowedStoreIds),
				)
			: allowedStoreIds !== undefined && allowedStoreIds.length === 0
				? sql`false`
				: eq(stores.organizationId, organizationId)

	return db
		.select({ id: stores.id, name: stores.name })
		.from(stores)
		.where(condition)
		.orderBy(stores.name)
}

export async function getComplaintsDashboardKpisForOrganization(
	organizationId: string,
	allowedStoreIds?: string[],
): Promise<ComplaintsDashboardKpis> {
	const storeCondition =
		allowedStoreIds !== undefined
			? allowedStoreIds.length === 0
				? sql`false`
				: inArray(complaints.storeId, allowedStoreIds)
			: undefined

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
			and(eq(complaints.organizationId, organizationId), storeCondition),
		)

	return {
		total: Number(summary?.total ?? 0),
		open: Number(summary?.open ?? 0),
		inReview: Number(summary?.inReview ?? 0),
		resolved: Number(summary?.resolved ?? 0),
		overdue: Number(summary?.overdue ?? 0),
	}
}

export async function getComplaintsDailyTrendForOrganization(
	organizationId: string,
	days: DashboardTrendDays,
	allowedStoreIds?: string[],
): Promise<DashboardTrendPoint[]> {
	const today = startOfDay(new Date())
	const startDate = subDays(today, days - 1)
	const endDate = endOfDay(today)
	const dayExpression = sql<string>`date(${complaints.createdAt})::text`

	const storeCondition =
		allowedStoreIds !== undefined
			? allowedStoreIds.length === 0
				? sql`false`
				: inArray(complaints.storeId, allowedStoreIds)
			: undefined

	const rows = await db
		.select({
			date: dayExpression,
			count: count(),
		})
		.from(complaints)
		.where(
			and(
				eq(complaints.organizationId, organizationId),
				sql`${complaints.createdAt} >= ${startDate}`,
				sql`${complaints.createdAt} <= ${endDate}`,
				storeCondition,
			),
		)
		.groupBy(dayExpression)
		.orderBy(asc(dayExpression))

	const countsByDay = new Map(
		rows.map((row) => [row.date, Number(row.count)]),
	)

	return eachDayOfInterval({ start: startDate, end: today }).map((date) => {
		const key = format(date, 'yyyy-MM-dd')

		return {
			date: key,
			count: countsByDay.get(key) ?? 0,
		}
	})
}
