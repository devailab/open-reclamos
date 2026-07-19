import { and, desc, eq, ilike, isNotNull, isNull, type SQL } from 'drizzle-orm'
import { db } from '@/database/database'
import { organizationSettings, stores } from '@/database/schema'
import { countRows } from '@/modules/shared/queries'
import type { StoresTableFilters } from './validation'

export interface StoreTableRow {
	id: string
	name: string
	slug: string
	type: string
	color: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
	formEnabled: boolean
	deletedAt: Date | null
	createdAt: Date
	updatedAt: Date | null
}

interface GetStoresTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: StoresTableFilters
}

const buildStoresTableConditions = (
	organizationId: string,
	filters: StoresTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		eq(stores.organizationId, organizationId),
	]

	if (filters.name.trim()) {
		conditions.push(ilike(stores.name, `%${filters.name.trim()}%`))
	}

	if (filters.type !== 'all') {
		conditions.push(eq(stores.type, filters.type))
	}

	if (filters.status === 'active') {
		conditions.push(isNull(stores.deletedAt))
	}

	if (filters.status === 'inactive') {
		conditions.push(isNotNull(stores.deletedAt))
	}

	return conditions
}

export async function checkStoreSlugExists(slug: string): Promise<boolean> {
	const [store] = await db
		.select({ id: stores.id })
		.from(stores)
		.where(eq(stores.slug, slug))
		.limit(1)

	return Boolean(store)
}

export async function getStoreByIdForOrganization(
	storeId: string,
	organizationId: string,
) {
	const [store] = await db
		.select({
			id: stores.id,
			slug: stores.slug,
			name: stores.name,
			type: stores.type,
			color: stores.color,
			ubigeoId: stores.ubigeoId,
			addressType: stores.addressType,
			address: stores.address,
			url: stores.url,
			formEnabled: stores.formEnabled,
			deletedAt: stores.deletedAt,
		})
		.from(stores)
		.where(
			and(
				eq(stores.id, storeId),
				eq(stores.organizationId, organizationId),
			),
		)
		.limit(1)

	return store ?? null
}

export async function getStoresTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetStoresTableForOrganizationParams): Promise<{
	rows: StoreTableRow[]
	totalItems: number
}> {
	const whereClause = and(
		...buildStoresTableConditions(organizationId, filters),
	)

	if (!whereClause) {
		return { rows: [], totalItems: 0 }
	}

	const offset = (page - 1) * pageSize

	const rows = await db
		.select({
			id: stores.id,
			name: stores.name,
			slug: stores.slug,
			type: stores.type,
			color: stores.color,
			ubigeoId: stores.ubigeoId,
			addressType: stores.addressType,
			address: stores.address,
			url: stores.url,
			formEnabled: stores.formEnabled,
			deletedAt: stores.deletedAt,
			createdAt: stores.createdAt,
			updatedAt: stores.updatedAt,
		})
		.from(stores)
		.where(whereClause)
		.orderBy(desc(stores.createdAt))
		.limit(pageSize)
		.offset(offset)

	return {
		rows,
		totalItems: await countRows(stores, whereClause),
	}
}

export async function getOrganizationFormEnabledForOrganization(
	organizationId: string,
) {
	const [result] = await db
		.select({ formEnabled: organizationSettings.formEnabled })
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, organizationId))
		.limit(1)

	return result?.formEnabled ?? true
}
