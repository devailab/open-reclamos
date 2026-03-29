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
import { complaints, stores } from '@/database/schema'
import type {
	ComplaintsTableFilters,
	DashboardTrendDays,
	DashboardTrendPoint,
} from './dashboard-validation'

export interface ComplaintTableRow {
	id: string
	correlative: string
	type: string
	firstName: string
	lastName: string
	storeId: string
	storeName: string
	status: string
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
	inProgress: number
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
			responseDeadline: complaints.responseDeadline,
			hasResponse: sql<boolean>`${complaints.officialResponse} IS NOT NULL`,
			createdAt: complaints.createdAt,
		})
		.from(complaints)
		.innerJoin(stores, eq(complaints.storeId, stores.id))
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
			inProgress: sql<number>`count(*) filter (where ${complaints.status} = 'in_progress')`,
			resolved: sql<number>`count(*) filter (where ${complaints.status} = 'resolved')`,
			overdue: sql<number>`count(*) filter (
				where ${complaints.status} in ('open', 'in_progress')
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
		inProgress: Number(summary?.inProgress ?? 0),
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
