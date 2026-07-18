'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/database/database'
import { rolePermissions, roles } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { syncRolePermissions } from '@/modules/rbac/queries'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import {
	checkRoleKeyExists,
	getAvailablePermissionIdsForOrganization,
	getRoleDetailForOrganization,
	getRolesTableForOrganization,
	getRoleUsageCount,
	type RoleDetailRow,
	type RoleTableRow,
} from './queries'
import {
	buildCustomRoleKey,
	normalizeRoleMutationInput,
	normalizeRolesPagination,
	normalizeRolesTableFilters,
	type RoleMutationInput,
	type RolesTableFilters,
	validateRoleId,
	validateRoleMutationInput,
} from './validation'

export type RoleActionResult = { error: string } | { success: true }

export interface GetRolesTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<RolesTableFilters>
}

export interface GetRolesTableActionResult {
	rows: RoleTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: RolesTableFilters
}

export interface GetRoleActionResult {
	role: RoleDetailRow | null
}

export async function $getRolesTableAction(
	input: GetRolesTableActionInput,
): Promise<GetRolesTableActionResult> {
	const access = await requireAccess('roles.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizeRolesTableFilters(),
		}
	}

	const { page, pageSize } = normalizeRolesPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeRolesTableFilters(input.filters)
	const { rows, totalItems } = await getRolesTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $getRoleAction(
	roleId: string,
): Promise<GetRoleActionResult | { error: string }> {
	const access = await requireAccess('roles.view')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const idError = validateRoleId(roleId)
	if (idError) return { error: idError }

	const role = await getRoleDetailForOrganization(
		roleId,
		access.membership.organizationId,
	)
	if (!role) return { error: MESSAGES.roles.notFound }

	return { role }
}

export async function $createRoleAction(
	input: RoleMutationInput,
): Promise<RoleActionResult> {
	const access = await requireAccess('roles.manage')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const normalizedInput = normalizeRoleMutationInput(input)
	const validationError = validateRoleMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const availablePermissionIds =
		await getAvailablePermissionIdsForOrganization(
			access.membership.organizationId,
		)
	const invalidPermissionId = normalizedInput.permissionIds.find(
		(permissionId) => !availablePermissionIds.has(permissionId),
	)
	if (invalidPermissionId) {
		return { error: MESSAGES.permissions.invalidSelection }
	}

	const key = buildCustomRoleKey(
		access.membership.organizationId,
		normalizedInput,
	)
	if (await checkRoleKeyExists(key)) {
		return { error: MESSAGES.roles.duplicateName }
	}

	try {
		await db.transaction(async (tx) => {
			const [role] = await tx
				.insert(roles)
				.values({
					organizationId: access.membership.organizationId,
					key,
					slug: normalizedInput.slug,
					name: normalizedInput.name,
					description: normalizedInput.description,
					isSystem: false,
					createdBy: access.session.user.id,
				})
				.returning({ id: roles.id })

			await syncRolePermissions(
				{
					roleId: role.id,
					permissionIds: normalizedInput.permissionIds,
					actorUserId: access.session.user.id,
				},
				tx,
			)

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.ROLE_CREATED,
				entityType: 'role',
				entityId: role.id,
				newData: {
					key,
					slug: normalizedInput.slug,
					name: normalizedInput.name,
					description: normalizedInput.description,
					permissionIds: normalizedInput.permissionIds,
				},
			})
		})
	} catch {
		return { error: MESSAGES.roles.createFailed }
	}

	revalidatePath('/dashboard/roles')
	return { success: true }
}

export async function $updateRoleAction(
	id: string,
	input: RoleMutationInput,
): Promise<RoleActionResult> {
	const access = await requireAccess('roles.manage')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const idError = validateRoleId(id)
	if (idError) return { error: idError }

	const role = await getRoleDetailForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!role) return { error: MESSAGES.roles.notFound }
	if (role.isSystem) {
		return { error: MESSAGES.roles.systemNotEditable }
	}

	const normalizedInput = normalizeRoleMutationInput(input)
	const validationError = validateRoleMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const availablePermissionIds =
		await getAvailablePermissionIdsForOrganization(
			access.membership.organizationId,
		)
	const invalidPermissionId = normalizedInput.permissionIds.find(
		(permissionId) => !availablePermissionIds.has(permissionId),
	)
	if (invalidPermissionId) {
		return { error: MESSAGES.permissions.invalidSelection }
	}

	const nextKey = buildCustomRoleKey(
		access.membership.organizationId,
		normalizedInput,
	)
	if (await checkRoleKeyExists(nextKey, role.id)) {
		return { error: MESSAGES.roles.duplicateName }
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(roles)
				.set({
					key: nextKey,
					slug: normalizedInput.slug,
					name: normalizedInput.name,
					description: normalizedInput.description,
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(roles.id, role.id),
						eq(
							roles.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await syncRolePermissions(
				{
					roleId: role.id,
					permissionIds: normalizedInput.permissionIds,
					actorUserId: access.session.user.id,
				},
				tx,
			)

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.ROLE_UPDATED,
				entityType: 'role',
				entityId: role.id,
				oldData: {
					key: role.key,
					slug: role.slug,
					name: role.name,
					description: role.description,
					permissionIds: role.permissionIds,
				},
				newData: {
					key: nextKey,
					slug: normalizedInput.slug,
					name: normalizedInput.name,
					description: normalizedInput.description,
					permissionIds: normalizedInput.permissionIds,
				},
			})
		})
	} catch {
		return { error: MESSAGES.roles.updateFailed }
	}

	revalidatePath('/dashboard/roles')
	return { success: true }
}

export async function $deleteRoleAction(id: string): Promise<RoleActionResult> {
	const access = await requireAccess('roles.manage')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const idError = validateRoleId(id)
	if (idError) return { error: idError }

	const role = await getRoleDetailForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!role) return { error: MESSAGES.roles.notFound }
	if (role.isSystem) {
		return { error: MESSAGES.roles.systemNotDeletable }
	}

	const usageCount = await getRoleUsageCount(role.id)
	if (usageCount > 0) {
		return {
			error: MESSAGES.roles.assignedNotDeletable,
		}
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.delete(rolePermissions)
				.where(eq(rolePermissions.roleId, role.id))
			await tx
				.update(roles)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(roles.id, role.id),
						eq(
							roles.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.ROLE_DELETED,
				entityType: 'role',
				entityId: role.id,
				oldData: {
					key: role.key,
					slug: role.slug,
					name: role.name,
					description: role.description,
				},
			})
		})
	} catch {
		return { error: MESSAGES.roles.deleteFailed }
	}

	revalidatePath('/dashboard/roles')
	return { success: true }
}
