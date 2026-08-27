import 'server-only'

import { and, count, desc, eq, gte, isNull, type SQL, sql } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	complaints,
	organizationMembers,
	organizations,
	stores,
	users,
} from '@/database/schema'
import { countRows } from '@/modules/shared/queries'
import type { OrganizationStatus } from './constants'
import type { PlatformOrganizationsTableFilters } from './validation'

/**
 * NOTA DE AISLAMIENTO MULTI-TENANT
 * Este módulo es la única excepción documentada a la regla de scoping por
 * `organizationId`: son lecturas agregadas de toda la plataforma. Cada función
 * exportada aquí solo debe invocarse desde código que ya pasó por
 * `requirePlatformAdmin()` (ver `./access.ts`).
 */

export interface PlatformOverviewMetrics {
	totalOrganizations: number
	activeOrganizations: number
	suspendedOrganizations: number
	totalStores: number
	totalComplaints: number
	complaintsLast30Days: number
	totalUsers: number
}

export interface PlatformOrganizationRow {
	id: string
	name: string
	slug: string
	legalName: string
	taxId: string
	status: OrganizationStatus
	suspendedAt: Date | null
	suspensionReason: string | null
	storeCount: number
	complaintCount: number
	memberCount: number
	createdAt: Date
}

const toNumber = (value: unknown): number => Number(value ?? 0)

export async function getPlatformOverviewMetrics(): Promise<PlatformOverviewMetrics> {
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

	const [organizationTotals, storeTotals, complaintTotals, userTotals] =
		await Promise.all([
			db
				.select({
					total: count(),
					suspended: sql<number>`count(*) filter (where ${organizations.status} <> 'active')`,
				})
				.from(organizations),
			db
				.select({ total: count() })
				.from(stores)
				.where(isNull(stores.deletedAt)),
			db
				.select({
					total: count(),
					last30Days: sql<number>`count(*) filter (where ${gte(complaints.createdAt, thirtyDaysAgo)})`,
				})
				.from(complaints),
			db.select({ total: count() }).from(users),
		])

	const totalOrganizations = toNumber(organizationTotals[0]?.total)
	const suspendedOrganizations = toNumber(organizationTotals[0]?.suspended)

	return {
		totalOrganizations,
		activeOrganizations: totalOrganizations - suspendedOrganizations,
		suspendedOrganizations,
		totalStores: toNumber(storeTotals[0]?.total),
		totalComplaints: toNumber(complaintTotals[0]?.total),
		complaintsLast30Days: toNumber(complaintTotals[0]?.last30Days),
		totalUsers: toNumber(userTotals[0]?.total),
	}
}

const buildOrganizationsTableConditions = (
	filters: PlatformOrganizationsTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = []

	if (filters.name.trim()) {
		const term = `%${filters.name.trim()}%`
		conditions.push(
			sql`(${organizations.name} ilike ${term} or ${organizations.legalName} ilike ${term} or ${organizations.taxId} ilike ${term})`,
		)
	}

	if (filters.status !== 'all') {
		conditions.push(eq(organizations.status, filters.status))
	}

	return conditions
}

interface GetOrganizationsTableParams {
	page: number
	pageSize: number
	filters: PlatformOrganizationsTableFilters
}

export async function getOrganizationsTableForPlatform({
	page,
	pageSize,
	filters,
}: GetOrganizationsTableParams): Promise<{
	rows: PlatformOrganizationRow[]
	totalItems: number
}> {
	const conditions = buildOrganizationsTableConditions(filters)
	const whereClause = conditions.length > 0 ? and(...conditions) : undefined
	const offset = (page - 1) * pageSize

	// Agregados en subconsultas separadas: un único join sobre tiendas y
	// reclamos multiplicaría las filas e inflaría ambos conteos.
	const storeCounts = db
		.select({
			organizationId: stores.organizationId,
			total: count().as('store_total'),
		})
		.from(stores)
		.where(isNull(stores.deletedAt))
		.groupBy(stores.organizationId)
		.as('store_counts')

	const complaintCounts = db
		.select({
			organizationId: complaints.organizationId,
			total: count().as('complaint_total'),
		})
		.from(complaints)
		.groupBy(complaints.organizationId)
		.as('complaint_counts')

	const memberCounts = db
		.select({
			organizationId: organizationMembers.organizationId,
			total: count().as('member_total'),
		})
		.from(organizationMembers)
		.groupBy(organizationMembers.organizationId)
		.as('member_counts')

	const rows = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			legalName: organizations.legalName,
			taxId: organizations.taxId,
			status: organizations.status,
			suspendedAt: organizations.suspendedAt,
			suspensionReason: organizations.suspensionReason,
			createdAt: organizations.createdAt,
			storeCount: sql<number>`coalesce(${storeCounts.total}, 0)`.mapWith(
				Number,
			),
			complaintCount:
				sql<number>`coalesce(${complaintCounts.total}, 0)`.mapWith(
					Number,
				),
			memberCount:
				sql<number>`coalesce(${memberCounts.total}, 0)`.mapWith(Number),
		})
		.from(organizations)
		.leftJoin(storeCounts, eq(storeCounts.organizationId, organizations.id))
		.leftJoin(
			complaintCounts,
			eq(complaintCounts.organizationId, organizations.id),
		)
		.leftJoin(
			memberCounts,
			eq(memberCounts.organizationId, organizations.id),
		)
		.where(whereClause)
		.orderBy(desc(organizations.createdAt))
		.limit(pageSize)
		.offset(offset)

	return {
		rows: rows.map((row) => ({
			...row,
			status: row.status as OrganizationStatus,
		})),
		totalItems: await countRows(organizations, whereClause),
	}
}

export async function getOrganizationForPlatform(organizationId: string) {
	const [organization] = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			legalName: organizations.legalName,
			taxId: organizations.taxId,
			status: organizations.status,
			suspendedAt: organizations.suspendedAt,
			suspensionReason: organizations.suspensionReason,
			createdAt: organizations.createdAt,
		})
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1)

	if (!organization) return null

	return {
		...organization,
		status: organization.status as OrganizationStatus,
	}
}
