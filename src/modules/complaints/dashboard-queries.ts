import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { db } from '@/database/database'
import { complaints, stores } from '@/database/schema'
import type { ComplaintsTableFilters } from './dashboard-validation'

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
	createdAt: Date
}

export interface StoreOption {
	id: string
	name: string
}

interface GetComplaintsTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: ComplaintsTableFilters
}

const buildComplaintsTableConditions = (
	organizationId: string,
	filters: ComplaintsTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		eq(complaints.organizationId, organizationId),
	]

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
}: GetComplaintsTableForOrganizationParams): Promise<{
	rows: ComplaintTableRow[]
	totalItems: number
}> {
	const whereClause = and(
		...buildComplaintsTableConditions(organizationId, filters),
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
): Promise<StoreOption[]> {
	return db
		.select({ id: stores.id, name: stores.name })
		.from(stores)
		.where(eq(stores.organizationId, organizationId))
		.orderBy(stores.name)
}
