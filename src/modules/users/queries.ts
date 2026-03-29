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
	or,
	type SQL,
} from 'drizzle-orm'
import { type DbTransaction, db } from '@/database/database'
import {
	organizationInvitationStores,
	organizationInvitations,
	organizationMemberPermissions,
	organizationMemberStores,
	organizationMembers,
	organizations,
	roles,
	stores,
	users,
} from '@/database/schema'
import {
	getInvitationDetailsByTokenHash as getInvitationDetailsByTokenHashFromRbac,
	getPermissionOptionsForOrganization,
	getRoleOptionsForOrganization,
	getRoleOptionsWithPermissionsForOrganization,
	getStoreOptionsForOrganization,
	type PermissionOption,
	type RoleOption,
	type StoreOption,
} from '@/modules/rbac/queries'
import { hashInvitationToken } from './lib'
import type {
	StoreAccessMode,
	UserStoreAccessMode,
	UsersTableFilters,
} from './validation'

type DatabaseExecutor = typeof db | DbTransaction

export interface UserTableRow {
	userId: string
	name: string
	email: string
	image: string | null
	roleId: string
	roleName: string
	roleSlug: string
	storeAccessMode: UserStoreAccessMode
	storeIds: string[]
	permissionIds: string[]
	createdAt: Date
	updatedAt: Date | null
	selectedStoresCount: number
	permissionCount: number
}

export interface InvitationTableRow {
	id: string
	email: string
	roleId: string
	roleName: string
	roleSlug: string
	storeAccessMode: UserStoreAccessMode
	storeIds: string[]
	createdAt: Date
	expiresAt: Date
}

export interface InvitationDetailsRow {
	id: string
	organizationId: string
	email: string
	roleId: string
	roleName: string
	roleSlug: string
	storeAccessMode: UserStoreAccessMode
	storeIds: string[]
	expiresAt: Date
	acceptedAt: Date | null
	revokedAt: Date | null
	createdAt: Date
}

export interface PublicInvitationDetails {
	id: string
	email: string
	roleName: string
	organizationName: string
	storeAccessMode: StoreAccessMode
	storeNames: string[]
	expiresAt: Date
	acceptedAt: Date | null
	revokedAt: Date | null
}

export interface UserAccessRow {
	userId: string
	name: string
	email: string
	image: string | null
	roleId: string
	roleName: string
	roleSlug: string
	storeAccessMode: UserStoreAccessMode
	storeIds: string[]
	permissionIds: string[]
}

export type UserManagementRoleOption = RoleOption
export type UserManagementStoreOption = StoreOption
export type UserManagementPermissionOption = PermissionOption

interface GetUsersTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: UsersTableFilters
}

interface GetInvitationsTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: UsersTableFilters
}

const normalizeIds = (values: string[]) => {
	return Array.from(
		new Set(
			values
				.map((value) => value.trim())
				.filter((value) => value.length > 0),
		),
	)
}

const buildUserConditions = (
	organizationId: string,
	filters: UsersTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		eq(organizationMembers.organizationId, organizationId),
		isNull(roles.deletedAt),
	]

	if (filters.roleId !== 'all') {
		conditions.push(eq(organizationMembers.roleId, filters.roleId))
	}

	if (
		filters.storeAccessMode === 'all' ||
		filters.storeAccessMode === 'selected'
	) {
		conditions.push(
			eq(organizationMembers.storeAccessMode, filters.storeAccessMode),
		)
	}

	if (filters.search) {
		const search = `%${filters.search}%`
		const searchCondition = or(
			ilike(users.name, search),
			ilike(users.email, search),
			ilike(roles.name, search),
		)
		if (searchCondition) conditions.push(searchCondition)
	}

	return conditions
}

const buildInvitationConditions = (
	organizationId: string,
	filters: UsersTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		eq(organizationInvitations.organizationId, organizationId),
		isNull(roles.deletedAt),
		isNull(organizationInvitations.acceptedAt),
		isNull(organizationInvitations.revokedAt),
		gt(organizationInvitations.expiresAt, new Date()),
	]

	if (filters.roleId !== 'all') {
		conditions.push(eq(organizationInvitations.roleId, filters.roleId))
	}

	if (
		filters.storeAccessMode === 'all' ||
		filters.storeAccessMode === 'selected'
	) {
		conditions.push(
			eq(
				organizationInvitations.storeAccessMode,
				filters.storeAccessMode,
			),
		)
	}

	if (filters.search) {
		const search = `%${filters.search}%`
		const searchCondition = or(
			ilike(organizationInvitations.email, search),
			ilike(roles.name, search),
		)
		if (searchCondition) conditions.push(searchCondition)
	}

	return conditions
}

export async function getUserRoleOptionsForOrganization(
	organizationId: string,
): Promise<UserManagementRoleOption[]> {
	return getRoleOptionsForOrganization(organizationId)
}

export async function getUserStoreOptionsForOrganization(
	organizationId: string,
): Promise<UserManagementStoreOption[]> {
	return getStoreOptionsForOrganization(organizationId)
}

export async function getUserAccessOptionsForOrganization(
	organizationId: string,
) {
	const [rolesOptions, permissionsOptions, storeOptions] = await Promise.all([
		getRoleOptionsWithPermissionsForOrganization(organizationId),
		getPermissionOptionsForOrganization(organizationId),
		getStoreOptionsForOrganization(organizationId),
	])

	return {
		rolesOptions,
		permissionsOptions,
		storeOptions,
	}
}

export async function getUsersTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetUsersTableForOrganizationParams): Promise<{
	rows: UserTableRow[]
	totalItems: number
}> {
	if (filters.status === 'pending') {
		return { rows: [], totalItems: 0 }
	}

	const whereClause = and(...buildUserConditions(organizationId, filters))
	if (!whereClause) return { rows: [], totalItems: 0 }

	const offset = (page - 1) * pageSize

	const memberRows = (await db
		.select({
			userId: users.id,
			name: users.name,
			email: users.email,
			image: users.image,
			roleId: organizationMembers.roleId,
			roleName: roles.name,
			roleSlug: roles.slug,
			storeAccessMode: organizationMembers.storeAccessMode,
			createdAt: organizationMembers.createdAt,
			updatedAt: organizationMembers.updatedAt,
		})
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.userId))
		.innerJoin(roles, eq(roles.id, organizationMembers.roleId))
		.where(whereClause)
		.orderBy(desc(organizationMembers.createdAt))
		.limit(pageSize)
		.offset(offset)) as Array<{
		userId: string
		name: string
		email: string
		image: string | null
		roleId: string
		roleName: string
		roleSlug: string
		storeAccessMode: string
		createdAt: Date
		updatedAt: Date | null
	}>

	const [total] = await db
		.select({ total: count() })
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.userId))
		.innerJoin(roles, eq(roles.id, organizationMembers.roleId))
		.where(whereClause)

	const memberIds = memberRows.map((row) => row.userId)
	const [storeRows, permissionRows] = await Promise.all([
		memberIds.length
			? db
					.select({
						userId: organizationMemberStores.userId,
						storeId: organizationMemberStores.storeId,
					})
					.from(organizationMemberStores)
					.where(
						and(
							eq(
								organizationMemberStores.organizationId,
								organizationId,
							),
							inArray(organizationMemberStores.userId, memberIds),
						),
					)
			: Promise.resolve([] as Array<{ userId: string; storeId: string }>),
		memberIds.length
			? db
					.select({
						userId: organizationMemberPermissions.userId,
						permissionId:
							organizationMemberPermissions.permissionId,
					})
					.from(organizationMemberPermissions)
					.where(
						and(
							eq(
								organizationMemberPermissions.organizationId,
								organizationId,
							),
							inArray(
								organizationMemberPermissions.userId,
								memberIds,
							),
						),
					)
			: Promise.resolve(
					[] as Array<{ userId: string; permissionId: string }>,
				),
	])

	const storeIdsByUserId = new Map<string, string[]>()
	for (const row of storeRows) {
		const current = storeIdsByUserId.get(row.userId) ?? []
		current.push(row.storeId)
		storeIdsByUserId.set(row.userId, current)
	}

	const permissionIdsByUserId = new Map<string, string[]>()
	for (const row of permissionRows) {
		const current = permissionIdsByUserId.get(row.userId) ?? []
		current.push(row.permissionId)
		permissionIdsByUserId.set(row.userId, current)
	}

	const rows: UserTableRow[] = memberRows.map((row) => ({
		userId: row.userId,
		name: row.name,
		email: row.email,
		image: row.image,
		roleId: row.roleId,
		roleName: row.roleName,
		roleSlug: row.roleSlug,
		storeAccessMode: row.storeAccessMode as UserStoreAccessMode,
		storeIds: storeIdsByUserId.get(row.userId) ?? [],
		permissionIds: permissionIdsByUserId.get(row.userId) ?? [],
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		selectedStoresCount: storeIdsByUserId.get(row.userId)?.length ?? 0,
		permissionCount: permissionIdsByUserId.get(row.userId)?.length ?? 0,
	}))

	return {
		rows,
		totalItems: total?.total ?? rows.length,
	}
}

export async function getInvitationsTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetInvitationsTableForOrganizationParams): Promise<{
	rows: InvitationTableRow[]
	totalItems: number
}> {
	if (filters.status === 'active') {
		return { rows: [], totalItems: 0 }
	}

	const whereClause = and(
		...buildInvitationConditions(organizationId, filters),
	)
	if (!whereClause) return { rows: [], totalItems: 0 }

	const offset = (page - 1) * pageSize

	const invitationRows = (await db
		.select({
			id: organizationInvitations.id,
			email: organizationInvitations.email,
			roleId: organizationInvitations.roleId,
			roleName: roles.name,
			roleSlug: roles.slug,
			storeAccessMode: organizationInvitations.storeAccessMode,
			createdAt: organizationInvitations.createdAt,
			expiresAt: organizationInvitations.expiresAt,
		})
		.from(organizationInvitations)
		.innerJoin(roles, eq(roles.id, organizationInvitations.roleId))
		.where(whereClause)
		.orderBy(desc(organizationInvitations.createdAt))
		.limit(pageSize)
		.offset(offset)) as Array<{
		id: string
		email: string
		roleId: string
		roleName: string
		roleSlug: string
		storeAccessMode: string
		createdAt: Date
		expiresAt: Date
	}>

	const [total] = await db
		.select({ total: count() })
		.from(organizationInvitations)
		.innerJoin(roles, eq(roles.id, organizationInvitations.roleId))
		.where(whereClause)

	const invitationIds = invitationRows.map((row) => row.id)
	const storeRows = invitationIds.length
		? ((await db
				.select({
					invitationId: organizationInvitationStores.invitationId,
					storeId: organizationInvitationStores.storeId,
				})
				.from(organizationInvitationStores)
				.where(
					inArray(
						organizationInvitationStores.invitationId,
						invitationIds,
					),
				)) as Array<{ invitationId: string; storeId: string }>)
		: []

	const storeIdsByInvitationId = new Map<string, string[]>()
	for (const row of storeRows) {
		const current = storeIdsByInvitationId.get(row.invitationId) ?? []
		current.push(row.storeId)
		storeIdsByInvitationId.set(row.invitationId, current)
	}

	const rows: InvitationTableRow[] = invitationRows.map((row) => ({
		id: row.id,
		email: row.email,
		roleId: row.roleId,
		roleName: row.roleName,
		roleSlug: row.roleSlug,
		storeAccessMode: row.storeAccessMode as UserStoreAccessMode,
		storeIds: storeIdsByInvitationId.get(row.id) ?? [],
		createdAt: row.createdAt,
		expiresAt: row.expiresAt,
	}))

	return {
		rows,
		totalItems: total?.total ?? rows.length,
	}
}

export async function getInvitationByIdForOrganization(
	invitationId: string,
	organizationId: string,
): Promise<InvitationDetailsRow | null> {
	const [invitation] = await db
		.select({
			id: organizationInvitations.id,
			organizationId: organizationInvitations.organizationId,
			email: organizationInvitations.email,
			roleId: organizationInvitations.roleId,
			roleName: roles.name,
			roleSlug: roles.slug,
			storeAccessMode: organizationInvitations.storeAccessMode,
			expiresAt: organizationInvitations.expiresAt,
			acceptedAt: organizationInvitations.acceptedAt,
			revokedAt: organizationInvitations.revokedAt,
			createdAt: organizationInvitations.createdAt,
		})
		.from(organizationInvitations)
		.innerJoin(roles, eq(roles.id, organizationInvitations.roleId))
		.where(
			and(
				eq(organizationInvitations.id, invitationId),
				eq(organizationInvitations.organizationId, organizationId),
			),
		)
		.limit(1)

	if (!invitation) return null

	const storeRows = await db
		.select({ storeId: organizationInvitationStores.storeId })
		.from(organizationInvitationStores)
		.where(eq(organizationInvitationStores.invitationId, invitation.id))

	return {
		...invitation,
		storeAccessMode: invitation.storeAccessMode as UserStoreAccessMode,
		storeIds: storeRows.map((row) => row.storeId),
	}
}

export async function getOpenInvitationByToken(token: string) {
	const tokenHash = hashInvitationToken(token)

	const [invitation] = await db
		.select({
			id: organizationInvitations.id,
			email: organizationInvitations.email,
			organizationId: organizationInvitations.organizationId,
			roleId: organizationInvitations.roleId,
			roleName: roles.name,
			roleSlug: roles.slug,
			storeAccessMode: organizationInvitations.storeAccessMode,
			expiresAt: organizationInvitations.expiresAt,
			acceptedAt: organizationInvitations.acceptedAt,
			revokedAt: organizationInvitations.revokedAt,
		})
		.from(organizationInvitations)
		.innerJoin(roles, eq(roles.id, organizationInvitations.roleId))
		.where(eq(organizationInvitations.tokenHash, tokenHash))
		.limit(1)

	return invitation
}

export async function getPublicInvitationDetails(
	token: string,
): Promise<PublicInvitationDetails | null> {
	const invitation = await getOpenInvitationByToken(token)
	if (!invitation) return null
	if (invitation.acceptedAt || invitation.revokedAt) return null
	if (invitation.expiresAt < new Date()) return null

	const [organization] = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, invitation.organizationId))
		.limit(1)

	const storeRows =
		invitation.storeAccessMode === 'selected'
			? await db
					.select({ name: stores.name })
					.from(organizationInvitationStores)
					.innerJoin(
						stores,
						eq(stores.id, organizationInvitationStores.storeId),
					)
					.where(
						eq(
							organizationInvitationStores.invitationId,
							invitation.id,
						),
					)
					.orderBy(asc(stores.name))
			: []

	return {
		id: invitation.id,
		email: invitation.email,
		roleName: invitation.roleName,
		organizationName: organization?.name ?? 'Organización',
		storeAccessMode: invitation.storeAccessMode as StoreAccessMode,
		storeNames: storeRows.map((row) => row.name),
		expiresAt: invitation.expiresAt,
		acceptedAt: invitation.acceptedAt,
		revokedAt: invitation.revokedAt,
	}
}

export async function getUserMembershipByEmail(
	email: string,
	organizationId: string,
) {
	const [membership] = await db
		.select({
			userId: organizationMembers.userId,
			email: users.email,
		})
		.from(users)
		.innerJoin(
			organizationMembers,
			eq(organizationMembers.userId, users.id),
		)
		.where(
			and(
				eq(users.email, email),
				eq(organizationMembers.organizationId, organizationId),
			),
		)
		.limit(1)

	return membership ?? null
}

export async function getExistingUserByEmail(email: string) {
	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
		})
		.from(users)
		.where(eq(users.email, email))
		.limit(1)

	return user ?? null
}

export async function getValidStoreIdsForOrganization(
	organizationId: string,
	storeIds: string[],
) {
	const normalizedStoreIds = normalizeIds(storeIds)
	if (normalizedStoreIds.length === 0) return []

	const rows = await db
		.select({ id: stores.id })
		.from(stores)
		.where(
			and(
				eq(stores.organizationId, organizationId),
				isNull(stores.deletedAt),
				inArray(stores.id, normalizedStoreIds),
			),
		)

	return rows.map((row) => row.id)
}

export async function validateStoresBelongToOrganization(
	organizationId: string,
	storeIds: string[],
) {
	const validStoreIds = await getValidStoreIdsForOrganization(
		organizationId,
		storeIds,
	)
	return validStoreIds.length === normalizeIds(storeIds).length
}

export async function syncInvitationStoreAccess(
	invitationId: string,
	organizationId: string,
	storeIds: string[],
	client: DatabaseExecutor = db,
) {
	const validStoreIds = await getValidStoreIdsForOrganization(
		organizationId,
		storeIds,
	)

	await client
		.delete(organizationInvitationStores)
		.where(eq(organizationInvitationStores.invitationId, invitationId))

	if (validStoreIds.length === 0) return

	await client.insert(organizationInvitationStores).values(
		validStoreIds.map((storeId) => ({
			invitationId,
			storeId,
		})),
	)
}

export async function syncMemberStoreAccess(
	userId: string,
	organizationId: string,
	storeIds: string[],
	client: DatabaseExecutor = db,
) {
	const validStoreIds = await getValidStoreIdsForOrganization(
		organizationId,
		storeIds,
	)

	await client
		.delete(organizationMemberStores)
		.where(
			and(
				eq(organizationMemberStores.userId, userId),
				eq(organizationMemberStores.organizationId, organizationId),
			),
		)

	if (validStoreIds.length === 0) return

	await client.insert(organizationMemberStores).values(
		validStoreIds.map((storeId) => ({
			userId,
			organizationId,
			storeId,
		})),
	)
}

export async function syncMemberPermissions(
	userId: string,
	organizationId: string,
	permissionIds: string[],
	client: DatabaseExecutor = db,
) {
	const normalizedPermissionIds = normalizeIds(permissionIds)

	await client
		.delete(organizationMemberPermissions)
		.where(
			and(
				eq(organizationMemberPermissions.userId, userId),
				eq(
					organizationMemberPermissions.organizationId,
					organizationId,
				),
			),
		)

	if (normalizedPermissionIds.length === 0) return

	await client.insert(organizationMemberPermissions).values(
		normalizedPermissionIds.map((permissionId) => ({
			userId,
			organizationId,
			permissionId,
		})),
	)
}

export async function getUserTableRowByIdForOrganization(
	userId: string,
	organizationId: string,
): Promise<UserAccessRow | null> {
	const [row] = await db
		.select({
			userId: users.id,
			name: users.name,
			email: users.email,
			image: users.image,
			roleId: organizationMembers.roleId,
			roleName: roles.name,
			roleSlug: roles.slug,
			storeAccessMode: organizationMembers.storeAccessMode,
		})
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.userId))
		.innerJoin(roles, eq(roles.id, organizationMembers.roleId))
		.where(
			and(
				eq(organizationMembers.userId, userId),
				eq(organizationMembers.organizationId, organizationId),
			),
		)
		.limit(1)

	if (!row) return null

	const [storeRows, permissionRows] = await Promise.all([
		db
			.select({ storeId: organizationMemberStores.storeId })
			.from(organizationMemberStores)
			.where(
				and(
					eq(organizationMemberStores.userId, userId),
					eq(organizationMemberStores.organizationId, organizationId),
				),
			),
		db
			.select({
				permissionId: organizationMemberPermissions.permissionId,
			})
			.from(organizationMemberPermissions)
			.where(
				and(
					eq(organizationMemberPermissions.userId, userId),
					eq(
						organizationMemberPermissions.organizationId,
						organizationId,
					),
				),
			),
	])

	return {
		...row,
		storeAccessMode: row.storeAccessMode as UserStoreAccessMode,
		storeIds: storeRows.map((item) => item.storeId),
		permissionIds: permissionRows.map((item) => item.permissionId),
	}
}

export async function getUserByIdForOrganization(
	userId: string,
	organizationId: string,
) {
	return getUserTableRowByIdForOrganization(userId, organizationId)
}

export async function getUserInvitationOptionsForOrganization(
	organizationId: string,
) {
	return getUserAccessOptionsForOrganization(organizationId)
}

export const getInvitationDetailsByTokenHash =
	getInvitationDetailsByTokenHashFromRbac
