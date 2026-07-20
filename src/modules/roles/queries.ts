import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	ilike,
	inArray,
	isNull,
	lt,
	max,
	min,
	or,
	type SQL,
} from 'drizzle-orm'
import { db } from '@/database/database'
import {
	organizationMembers,
	permissions,
	rolePermissions,
	roles,
} from '@/database/schema'
import { isRoleAssignableSystemPermissionKey } from '@/modules/rbac/lib'
import { countRows } from '@/modules/shared/queries'
import type { RolesTableFilters } from './validation'

export interface RoleTableRow {
	id: string
	key: string
	slug: string
	name: string
	description: string | null
	level: number
	isSystem: boolean
	deletedAt: Date | null
	createdAt: Date
	updatedAt: Date | null
	permissionsCount: number
	membersCount: number
	canMoveUp: boolean
	canMoveDown: boolean
}

export interface RoleDetailRow {
	id: string
	key: string
	slug: string
	name: string
	description: string | null
	level: number
	isSystem: boolean
	deletedAt: Date | null
	createdAt: Date
	updatedAt: Date | null
	permissionIds: string[]
}

interface GetRolesTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: RolesTableFilters
}

const buildRolesTableConditions = (
	organizationId: string,
	filters: RolesTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		isNull(roles.deletedAt),
		eq(roles.organizationId, organizationId),
	]

	if (filters.search.trim()) {
		const search = `%${filters.search.trim()}%`
		const searchCondition = or(
			ilike(roles.name, search),
			ilike(roles.slug, search),
		)
		if (searchCondition !== undefined) {
			conditions.push(searchCondition)
		}
	}

	if (filters.scope === 'system') {
		conditions.push(eq(roles.isSystem, true))
	}

	if (filters.scope === 'custom') {
		conditions.push(eq(roles.isSystem, false))
	}

	return conditions
}

export async function getRoleByIdForOrganization(
	roleId: string,
	organizationId: string,
) {
	const [role] = await db
		.select({
			id: roles.id,
			key: roles.key,
			slug: roles.slug,
			name: roles.name,
			description: roles.description,
			level: roles.level,
			isSystem: roles.isSystem,
			deletedAt: roles.deletedAt,
			createdAt: roles.createdAt,
			updatedAt: roles.updatedAt,
		})
		.from(roles)
		.where(
			and(
				eq(roles.id, roleId),
				isNull(roles.deletedAt),
				eq(roles.organizationId, organizationId),
			),
		)
		.limit(1)

	return role ?? null
}

export async function getRoleDetailForOrganization(
	roleId: string,
	organizationId: string,
): Promise<RoleDetailRow | null> {
	const role = await getRoleByIdForOrganization(roleId, organizationId)
	if (!role) return null

	const rows = await db
		.select({
			permissionId: rolePermissions.permissionId,
		})
		.from(rolePermissions)
		.innerJoin(roles, eq(roles.id, rolePermissions.roleId))
		.where(
			and(
				eq(rolePermissions.roleId, roleId),
				eq(roles.organizationId, organizationId),
			),
		)

	return {
		...role,
		permissionIds: rows.map((row) => row.permissionId),
	}
}

export async function getRolesTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetRolesTableForOrganizationParams): Promise<{
	rows: RoleTableRow[]
	totalItems: number
}> {
	const whereClause = and(
		...buildRolesTableConditions(organizationId, filters),
	)
	if (!whereClause) return { rows: [], totalItems: 0 }

	const offset = (page - 1) * pageSize

	const rows = await db
		.select({
			id: roles.id,
			key: roles.key,
			slug: roles.slug,
			name: roles.name,
			description: roles.description,
			level: roles.level,
			isSystem: roles.isSystem,
			deletedAt: roles.deletedAt,
			createdAt: roles.createdAt,
			updatedAt: roles.updatedAt,
		})
		.from(roles)
		.where(whereClause)
		.orderBy(asc(roles.level), asc(roles.name))
		.limit(pageSize)
		.offset(offset)

	const [customLevelBounds] = await db
		.select({
			minLevel: min(roles.level),
			maxLevel: max(roles.level),
		})
		.from(roles)
		.where(
			and(
				eq(roles.organizationId, organizationId),
				eq(roles.isSystem, false),
				isNull(roles.deletedAt),
			),
		)

	const roleIds = rows.map((row) => row.id)
	const permissionCounts = roleIds.length
		? await db
				.select({
					roleId: rolePermissions.roleId,
					total: count(),
				})
				.from(rolePermissions)
				.where(inArray(rolePermissions.roleId, roleIds))
				.groupBy(rolePermissions.roleId)
		: []

	const memberCounts = roleIds.length
		? await db
				.select({
					roleId: organizationMembers.roleId,
					total: count(),
				})
				.from(organizationMembers)
				.where(inArray(organizationMembers.roleId, roleIds))
				.groupBy(organizationMembers.roleId)
		: []

	const permissionCountByRoleId = new Map(
		permissionCounts.map((row) => [row.roleId, row.total]),
	)
	const memberCountByRoleId = new Map(
		memberCounts.map((row) => [row.roleId, row.total]),
	)

	return {
		rows: rows.map((row) => ({
			...row,
			permissionsCount: permissionCountByRoleId.get(row.id) ?? 0,
			membersCount: memberCountByRoleId.get(row.id) ?? 0,
			canMoveUp:
				!row.isSystem &&
				customLevelBounds?.minLevel !== null &&
				row.level > customLevelBounds.minLevel,
			canMoveDown:
				!row.isSystem &&
				customLevelBounds?.maxLevel !== null &&
				row.level < customLevelBounds.maxLevel,
		})),
		totalItems: await countRows(roles, whereClause),
	}
}

export async function getNextRoleLevelForOrganization(
	organizationId: string,
): Promise<number> {
	const [result] = await db
		.select({ maxLevel: max(roles.level) })
		.from(roles)
		.where(
			and(
				eq(roles.organizationId, organizationId),
				isNull(roles.deletedAt),
			),
		)

	return (result?.maxLevel ?? 0) + 1
}

export type RoleMoveDirection = 'up' | 'down'

export async function getAdjacentCustomRoleForOrganization(params: {
	organizationId: string
	level: number
	direction: RoleMoveDirection
}) {
	const isMovingUp = params.direction === 'up'
	const [role] = await db
		.select({ id: roles.id, level: roles.level })
		.from(roles)
		.where(
			and(
				eq(roles.organizationId, params.organizationId),
				eq(roles.isSystem, false),
				isNull(roles.deletedAt),
				isMovingUp
					? lt(roles.level, params.level)
					: gt(roles.level, params.level),
			),
		)
		.orderBy(isMovingUp ? desc(roles.level) : asc(roles.level))
		.limit(1)

	return role ?? null
}

export async function checkRoleKeyExists(key: string, excludeRoleId?: string) {
	const rows = await db
		.select({ id: roles.id })
		.from(roles)
		.where(and(eq(roles.key, key), isNull(roles.deletedAt)))

	return rows.some((row) => row.id !== excludeRoleId)
}

export async function getRoleUsageCount(roleId: string) {
	return countRows(
		organizationMembers,
		eq(organizationMembers.roleId, roleId),
	)
}

export async function getRolePermissionIds(roleId: string) {
	const rows = await db
		.select({ permissionId: rolePermissions.permissionId })
		.from(rolePermissions)
		.where(eq(rolePermissions.roleId, roleId))

	return rows.map((row) => row.permissionId)
}

export async function getAvailablePermissionIdsForOrganization(
	organizationId: string,
) {
	const rows = await db
		.select({
			id: permissions.id,
			key: permissions.key,
			isSystem: permissions.isSystem,
		})
		.from(permissions)
		.where(
			and(
				isNull(permissions.deletedAt),
				or(
					isNull(permissions.organizationId),
					eq(permissions.organizationId, organizationId),
				),
			),
		)

	return new Set(
		rows
			.filter(
				(permission) =>
					!permission.isSystem ||
					isRoleAssignableSystemPermissionKey(permission.key),
			)
			.map((row) => row.id),
	)
}
