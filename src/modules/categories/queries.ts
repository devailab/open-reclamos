import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm'
import { db } from '@/database/database'
import { complaintCategories } from '@/database/schema'
import type { CategoriesTableFilters } from './validation'

export interface ComplaintCategoryRow {
	id: string
	name: string
	description: string | null
	createdAt: Date
	updatedAt: Date | null
}

interface GetCategoriesTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: CategoriesTableFilters
}

function buildCategoriesConditions(
	organizationId: string,
	filters: CategoriesTableFilters,
): SQL<unknown>[] {
	const conditions: SQL<unknown>[] = [
		eq(complaintCategories.organizationId, organizationId),
	]

	if (filters.search.trim()) {
		const term = `%${filters.search.trim()}%`
		conditions.push(ilike(complaintCategories.name, term))
	}

	return conditions
}

export async function getComplaintCategoriesForOrganization(
	organizationId: string,
) {
	return db
		.select({
			id: complaintCategories.id,
			name: complaintCategories.name,
			description: complaintCategories.description,
		})
		.from(complaintCategories)
		.where(eq(complaintCategories.organizationId, organizationId))
		.orderBy(asc(complaintCategories.name))
}

export async function getCategoriesTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetCategoriesTableForOrganizationParams): Promise<{
	rows: ComplaintCategoryRow[]
	totalItems: number
}> {
	const whereClause = and(
		...buildCategoriesConditions(organizationId, filters),
	)

	if (!whereClause) {
		return { rows: [], totalItems: 0 }
	}

	const offset = (page - 1) * pageSize
	const rows = await db
		.select({
			id: complaintCategories.id,
			name: complaintCategories.name,
			description: complaintCategories.description,
			createdAt: complaintCategories.createdAt,
			updatedAt: complaintCategories.updatedAt,
		})
		.from(complaintCategories)
		.where(whereClause)
		.orderBy(desc(complaintCategories.createdAt))
		.limit(pageSize)
		.offset(offset)

	const [total] = await db
		.select({ total: count() })
		.from(complaintCategories)
		.where(whereClause)

	return {
		rows,
		totalItems: total?.total ?? 0,
	}
}
