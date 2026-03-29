import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'
import { type DbTransaction, db } from '@/database/database'
import {
	organizationInvitationStores,
	organizationInvitations,
	organizationMemberPermissions,
	organizationMemberStores,
	organizationMembers,
	organizations,
	permissions,
	rolePermissions,
	roles,
	stores,
} from '@/database/schema'
import { BASE_ROLE_DEFINITIONS, SYSTEM_PERMISSION_DEFINITIONS } from './lib'

type DatabaseExecutor = typeof db | DbTransaction

export interface MembershipContext {
	userId: string
	organizationId: string
	roleId: string
	roleKey: string
	roleSlug: string
	roleName: string
	storeAccessMode: 'all' | 'selected'
	permissionKeys: string[]
	storeIds: string[]
}

export interface RoleOption {
	id: string
	name: string
	slug: string
	isSystem: boolean
}

export interface RoleOptionWithPermissions extends RoleOption {
	permissionIds: string[]
}

export interface PermissionOption {
	id: string
	key: string
	module: string
	name: string
	description: string | null
	isSystem: boolean
}

export interface StoreOption {
	id: string
	name: string
}

export interface InvitationDetails {
	id: string
	organizationId: string
	organizationName: string
	email: string
	roleId: string
	roleName: string
	roleSlug: string
	storeAccessMode: 'all' | 'selected'
	storeIds: string[]
	storeNames: string[]
	expiresAt: Date
	acceptedAt: Date | null
	revokedAt: Date | null
}

export async function getOrganizationForUser(userId: string) {
	const [membership] = await db
		.select({ organizationId: organizationMembers.organizationId })
		.from(organizationMembers)
		.where(eq(organizationMembers.userId, userId))
		.limit(1)

	return membership?.organizationId ?? null
}

export async function getMembershipContext(
	userId: string,
): Promise<MembershipContext | null> {
	const [membership] = await db
		.select({
			userId: organizationMembers.userId,
			organizationId: organizationMembers.organizationId,
			roleId: organizationMembers.roleId,
			storeAccessMode: organizationMembers.storeAccessMode,
			roleKey: roles.key,
			roleSlug: roles.slug,
			roleName: roles.name,
		})
		.from(organizationMembers)
		.innerJoin(roles, eq(organizationMembers.roleId, roles.id))
		.where(eq(organizationMembers.userId, userId))
		.limit(1)

	if (!membership) return null

	const permissionRows = await db
		.select({ key: permissions.key })
		.from(rolePermissions)
		.innerJoin(
			permissions,
			eq(rolePermissions.permissionId, permissions.id),
		)
		.where(
			and(
				eq(rolePermissions.roleId, membership.roleId),
				isNull(permissions.deletedAt),
			),
		)

	const memberPermissionRows = await db
		.select({ key: permissions.key })
		.from(organizationMemberPermissions)
		.innerJoin(
			permissions,
			eq(organizationMemberPermissions.permissionId, permissions.id),
		)
		.where(
			and(
				eq(organizationMemberPermissions.userId, membership.userId),
				eq(
					organizationMemberPermissions.organizationId,
					membership.organizationId,
				),
				isNull(permissions.deletedAt),
			),
		)

	const assignedStores =
		membership.storeAccessMode === 'selected'
			? await db
					.select({ id: organizationMemberStores.storeId })
					.from(organizationMemberStores)
					.innerJoin(
						stores,
						and(
							eq(organizationMemberStores.storeId, stores.id),
							eq(
								stores.organizationId,
								membership.organizationId,
							),
							isNull(stores.deletedAt),
						),
					)
					.where(
						and(
							eq(
								organizationMemberStores.userId,
								membership.userId,
							),
							eq(
								organizationMemberStores.organizationId,
								membership.organizationId,
							),
						),
					)
			: []

	return {
		userId: membership.userId,
		organizationId: membership.organizationId,
		roleId: membership.roleId,
		roleKey: membership.roleKey,
		roleSlug: membership.roleSlug,
		roleName: membership.roleName,
		storeAccessMode: membership.storeAccessMode as 'all' | 'selected',
		permissionKeys: Array.from(
			new Set([
				...permissionRows.map((permission) => permission.key),
				...memberPermissionRows.map((permission) => permission.key),
			]),
		),
		storeIds: assignedStores.map((store) => store.id),
	}
}

export function hasPermission(
	context: MembershipContext | null,
	permissionKey: string,
) {
	return context?.permissionKeys.includes(permissionKey) ?? false
}

export async function getSystemRoleByKey(key: string) {
	const [role] = await db
		.select({
			id: roles.id,
			key: roles.key,
			slug: roles.slug,
			name: roles.name,
		})
		.from(roles)
		.where(
			and(
				eq(roles.key, key),
				eq(roles.isSystem, true),
				isNull(roles.deletedAt),
			),
		)
		.limit(1)

	return role ?? null
}

export async function findRoleByKeyForOrganization(
	key: string,
	organizationId: string,
	client: DatabaseExecutor = db,
) {
	const [role] = await client
		.select({
			id: roles.id,
			key: roles.key,
			slug: roles.slug,
			name: roles.name,
			description: roles.description,
			isSystem: roles.isSystem,
			deletedAt: roles.deletedAt,
		})
		.from(roles)
		.where(
			and(
				eq(roles.key, key),
				eq(roles.organizationId, organizationId),
				isNull(roles.deletedAt),
			),
		)
		.limit(1)

	return role ?? null
}

export async function getRoleOptionsForOrganization(
	organizationId: string,
): Promise<RoleOption[]> {
	return db
		.select({
			id: roles.id,
			name: roles.name,
			slug: roles.slug,
			isSystem: roles.isSystem,
		})
		.from(roles)
		.where(
			and(
				isNull(roles.deletedAt),
				eq(roles.organizationId, organizationId),
			),
		)
		.orderBy(asc(roles.isSystem), asc(roles.name))
}

export async function getRoleOptionsWithPermissionsForOrganization(
	organizationId: string,
): Promise<RoleOptionWithPermissions[]> {
	const roleOpts = await getRoleOptionsForOrganization(organizationId)
	if (roleOpts.length === 0) return []

	const roleIds = roleOpts.map((r) => r.id)
	const rows = await db
		.select({
			roleId: rolePermissions.roleId,
			permissionId: rolePermissions.permissionId,
		})
		.from(rolePermissions)
		.where(inArray(rolePermissions.roleId, roleIds))

	const permsByRole = new Map<string, string[]>()
	for (const row of rows) {
		const current = permsByRole.get(row.roleId) ?? []
		current.push(row.permissionId)
		permsByRole.set(row.roleId, current)
	}

	return roleOpts.map((role) => ({
		...role,
		permissionIds: permsByRole.get(role.id) ?? [],
	}))
}

export async function getPermissionOptionsForOrganization(
	organizationId: string,
): Promise<PermissionOption[]> {
	return db
		.select({
			id: permissions.id,
			key: permissions.key,
			module: permissions.module,
			name: permissions.name,
			description: permissions.description,
			isSystem: permissions.isSystem,
		})
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
		.orderBy(asc(permissions.module), asc(permissions.name))
}

export async function getStoreOptionsForOrganization(
	organizationId: string,
): Promise<StoreOption[]> {
	return db
		.select({
			id: stores.id,
			name: stores.name,
		})
		.from(stores)
		.where(
			and(
				eq(stores.organizationId, organizationId),
				isNull(stores.deletedAt),
			),
		)
		.orderBy(asc(stores.name))
}

export async function syncRolePermissions(
	params: {
		roleId: string
		permissionIds: string[]
		actorUserId: string
	},
	client: DatabaseExecutor = db,
) {
	await client
		.delete(rolePermissions)
		.where(eq(rolePermissions.roleId, params.roleId))

	if (params.permissionIds.length === 0) return

	await client.insert(rolePermissions).values(
		params.permissionIds.map((permissionId) => ({
			roleId: params.roleId,
			permissionId,
			createdBy: params.actorUserId,
		})),
	)
}

export async function ensureSystemPermissions(client: DatabaseExecutor = db) {
	await client
		.insert(permissions)
		.values(
			SYSTEM_PERMISSION_DEFINITIONS.map((definition) => ({
				key: definition.key,
				slug: definition.slug,
				module: definition.module,
				name: definition.name,
				description: definition.description,
				isSystem: true,
			})),
		)
		.onConflictDoNothing({ target: permissions.key })
}

export async function ensureOrganizationRoles(
	params: {
		organizationId: string
		userId: string
	},
	client: DatabaseExecutor = db,
) {
	await ensureSystemPermissions(client)

	await client
		.insert(roles)
		.values(
			BASE_ROLE_DEFINITIONS.map((definition) => ({
				organizationId: params.organizationId,
				key: definition.key,
				slug: definition.slug,
				name: definition.name,
				description: definition.description,
				isSystem: true,
				createdBy: params.userId,
			})),
		)
		.onConflictDoNothing({
			target: [roles.organizationId, roles.key],
		})

	const [roleRows, permissionRows] = await Promise.all([
		client
			.select({
				id: roles.id,
				key: roles.key,
			})
			.from(roles)
			.where(
				and(
					eq(roles.organizationId, params.organizationId),
					inArray(
						roles.key,
						BASE_ROLE_DEFINITIONS.map(
							(definition) => definition.key,
						),
					),
					isNull(roles.deletedAt),
				),
			),
		client
			.select({
				id: permissions.id,
				key: permissions.key,
			})
			.from(permissions)
			.where(
				inArray(
					permissions.key,
					SYSTEM_PERMISSION_DEFINITIONS.map(
						(definition) => definition.key,
					),
				),
			),
	])

	const roleIdByKey = new Map(roleRows.map((row) => [row.key, row.id]))
	const permissionIdByKey = new Map(
		permissionRows.map((row) => [row.key, row.id]),
	)

	const rowsToInsert = BASE_ROLE_DEFINITIONS.flatMap((definition) => {
		const roleId = roleIdByKey.get(definition.key)
		if (!roleId) return []

		return definition.permissionKeys.flatMap((permissionKey) => {
			const permissionId = permissionIdByKey.get(permissionKey)
			if (!permissionId) return []

			return {
				roleId,
				permissionId,
				createdBy: params.userId,
			}
		})
	})

	if (rowsToInsert.length === 0) return

	await client
		.insert(rolePermissions)
		.values(rowsToInsert)
		.onConflictDoNothing({
			target: [rolePermissions.roleId, rolePermissions.permissionId],
		})
}

export async function getAvailablePermissionIdsForOrganization(
	organizationId: string,
) {
	const rows = await db
		.select({ id: permissions.id })
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

	return new Set(rows.map((row) => row.id))
}

export async function getPermissionsByIds(permissionIds: string[]) {
	if (permissionIds.length === 0) return []

	return db
		.select({
			id: permissions.id,
			key: permissions.key,
			module: permissions.module,
			name: permissions.name,
		})
		.from(permissions)
		.where(inArray(permissions.id, permissionIds))
}

export async function getInvitationDetailsByTokenHash(tokenHash: string) {
	const [invitation] = await db
		.select({
			id: organizationInvitations.id,
			organizationId: organizationInvitations.organizationId,
			organizationName: organizations.name,
			email: organizationInvitations.email,
			roleId: organizationInvitations.roleId,
			roleName: roles.name,
			roleSlug: roles.slug,
			storeAccessMode: organizationInvitations.storeAccessMode,
			expiresAt: organizationInvitations.expiresAt,
			acceptedAt: organizationInvitations.acceptedAt,
			revokedAt: organizationInvitations.revokedAt,
		})
		.from(organizationInvitations)
		.innerJoin(
			organizations,
			eq(organizations.id, organizationInvitations.organizationId),
		)
		.innerJoin(roles, eq(roles.id, organizationInvitations.roleId))
		.where(eq(organizationInvitations.tokenHash, tokenHash))
		.limit(1)

	if (!invitation) return null

	const storeRows = await db
		.select({
			id: stores.id,
			name: stores.name,
		})
		.from(organizationInvitationStores)
		.innerJoin(stores, eq(stores.id, organizationInvitationStores.storeId))
		.where(
			and(
				eq(organizationInvitationStores.invitationId, invitation.id),
				eq(stores.organizationId, invitation.organizationId),
				isNull(stores.deletedAt),
			),
		)
		.orderBy(asc(stores.name))

	return {
		...invitation,
		storeAccessMode: invitation.storeAccessMode as 'all' | 'selected',
		storeIds: storeRows.map((row) => row.id),
		storeNames: storeRows.map((row) => row.name),
	} satisfies InvitationDetails
}
