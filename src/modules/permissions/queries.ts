import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	type SQL,
} from 'drizzle-orm'
import { db } from '@/database/database'
import { permissions, rolePermissions } from '@/database/schema'
import type { PermissionsTableFilters } from './validation'

export interface PermissionTableRow {
	id: string
	key: string
	slug: string
	module: string
	name: string
	description: string | null
	isSystem: boolean
	deletedAt: Date | null
	createdAt: Date
	assignedRolesCount: number
}

interface GetPermissionsTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: PermissionsTableFilters
}

const buildPermissionsTableConditions = (
	organizationId: string,
	filters: PermissionsTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = []

	if (filters.search) {
		conditions.push(ilike(permissions.name, `%${filters.search}%`))
	}

	if (filters.module !== 'all') {
		conditions.push(eq(permissions.module, filters.module))
	}

	if (filters.scope === 'system') {
		conditions.push(eq(permissions.isSystem, true))
	}

	if (filters.scope === 'custom') {
		conditions.push(eq(permissions.organizationId, organizationId))
	}

	return conditions
}

export async function getPermissionByIdForOrganization(
	permissionId: string,
	organizationId: string,
) {
	const [permission] = await db
		.select({
			id: permissions.id,
			key: permissions.key,
			slug: permissions.slug,
			module: permissions.module,
			name: permissions.name,
			description: permissions.description,
			isSystem: permissions.isSystem,
			organizationId: permissions.organizationId,
			deletedAt: permissions.deletedAt,
		})
		.from(permissions)
		.where(
			and(
				eq(permissions.id, permissionId),
				isNull(permissions.deletedAt),
				or(
					eq(permissions.isSystem, true),
					eq(permissions.organizationId, organizationId),
				),
			),
		)
		.limit(1)

	return permission ?? null
}

export async function getPermissionModuleOptionsForOrganization(
	organizationId: string,
) {
	const rows = await db
		.select({ module: permissions.module })
		.from(permissions)
		.where(
			and(
				isNull(permissions.deletedAt),
				or(
					eq(permissions.isSystem, true),
					eq(permissions.organizationId, organizationId),
				),
			),
		)

	return Array.from(new Set(rows.map((row) => row.module))).sort()
}

export async function getPermissionsTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetPermissionsTableForOrganizationParams): Promise<{
	rows: PermissionTableRow[]
	totalItems: number
}> {
	const whereClause = and(
		isNull(permissions.deletedAt),
		or(
			eq(permissions.isSystem, true),
			eq(permissions.organizationId, organizationId),
		),
		...buildPermissionsTableConditions(organizationId, filters).filter(
			Boolean,
		),
	)

	if (!whereClause) return { rows: [], totalItems: 0 }

	const offset = (page - 1) * pageSize

	const permissionRows = await db
		.select({
			id: permissions.id,
			key: permissions.key,
			slug: permissions.slug,
			module: permissions.module,
			name: permissions.name,
			description: permissions.description,
			isSystem: permissions.isSystem,
			deletedAt: permissions.deletedAt,
			createdAt: permissions.createdAt,
		})
		.from(permissions)
		.where(whereClause)
		.orderBy(
			desc(permissions.isSystem),
			permissions.module,
			permissions.name,
		)
		.limit(pageSize)
		.offset(offset)

	const [total] = await db
		.select({ total: count() })
		.from(permissions)
		.where(whereClause)

	const permissionIds = permissionRows.map((row) => row.id)
	const assignedRoleCounts = permissionIds.length
		? await db
				.select({
					permissionId: rolePermissions.permissionId,
					total: count(),
				})
				.from(rolePermissions)
				.where(inArray(rolePermissions.permissionId, permissionIds))
				.groupBy(rolePermissions.permissionId)
		: []

	const countsByPermissionId = new Map(
		assignedRoleCounts.map((row) => [row.permissionId, row.total]),
	)

	return {
		rows: permissionRows.map((row) => ({
			...row,
			assignedRolesCount: countsByPermissionId.get(row.id) ?? 0,
		})),
		totalItems: total?.total ?? 0,
	}
}

export async function checkPermissionKeyExists(
	key: string,
	excludePermissionId?: string,
) {
	const rows = await db
		.select({ id: permissions.id })
		.from(permissions)
		.where(and(eq(permissions.key, key), isNull(permissions.deletedAt)))

	return rows.some((row) => row.id !== excludePermissionId)
}

export async function getPermissionUsageCount(permissionId: string) {
	const [result] = await db
		.select({ total: count() })
		.from(rolePermissions)
		.where(eq(rolePermissions.permissionId, permissionId))

	return result?.total ?? 0
}
