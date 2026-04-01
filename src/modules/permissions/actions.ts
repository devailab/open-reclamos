'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { permissions, rolePermissions } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	checkPermissionKeyExists,
	getPermissionByIdForOrganization,
	getPermissionsTableForOrganization,
	getPermissionUsageCount,
	type PermissionTableRow,
} from './queries'
import {
	buildCustomPermissionKey,
	normalizePermissionMutationInput,
	normalizePermissionsPagination,
	normalizePermissionsTableFilters,
	type PermissionMutationInput,
	type PermissionsTableFilters,
	validatePermissionId,
	validatePermissionMutationInput,
} from './validation'

export type PermissionActionResult = { error: string } | { success: true }

export interface GetPermissionsTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<PermissionsTableFilters>
}

export interface GetPermissionsTableActionResult {
	rows: PermissionTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: PermissionsTableFilters
}

async function requirePermissionsAccess(permissionKey: string) {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return {
			error: 'No tienes permisos para realizar esta acción.',
		} as const
	}

	return { session, membership } as const
}

export async function $getPermissionsTableAction(
	input: GetPermissionsTableActionInput,
): Promise<GetPermissionsTableActionResult> {
	const access = await requirePermissionsAccess('permissions.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizePermissionsTableFilters(),
		}
	}

	const { page, pageSize } = normalizePermissionsPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizePermissionsTableFilters(input.filters)
	const { rows, totalItems } = await getPermissionsTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $createPermissionAction(
	input: PermissionMutationInput,
): Promise<PermissionActionResult> {
	const access = await requirePermissionsAccess('permissions.manage')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const normalizedInput = normalizePermissionMutationInput(input)
	const validationError = validatePermissionMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const key = buildCustomPermissionKey(
		access.membership.organizationId,
		normalizedInput,
	)
	if (await checkPermissionKeyExists(key)) {
		return { error: 'Ya existe un permiso personalizado con ese nombre.' }
	}

	try {
		await db.transaction(async (tx) => {
			const [permission] = await tx
				.insert(permissions)
				.values({
					organizationId: access.membership.organizationId,
					key,
					slug: normalizedInput.slug,
					module: normalizedInput.module,
					name: normalizedInput.name,
					description: normalizedInput.description,
					isSystem: false,
					createdBy: access.session.user.id,
				})
				.returning({ id: permissions.id })

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.PERMISSION_CREATED,
					entityType: 'permission',
					entityId: permission.id,
					newData: {
						name: normalizedInput.name,
						module: normalizedInput.module,
						description: normalizedInput.description,
						slug: normalizedInput.slug,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo crear el permiso. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/permissions')
	revalidatePath('/dashboard/roles')
	return { success: true }
}

export async function $updatePermissionAction(
	id: string,
	input: PermissionMutationInput,
): Promise<PermissionActionResult> {
	const access = await requirePermissionsAccess('permissions.manage')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const idError = validatePermissionId(id)
	if (idError) return { error: idError }

	const permission = await getPermissionByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!permission) return { error: 'El permiso no fue encontrado.' }
	if (permission.isSystem) {
		return { error: 'Los permisos base no se pueden editar.' }
	}

	const normalizedInput = normalizePermissionMutationInput(input)
	const validationError = validatePermissionMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const nextKey = buildCustomPermissionKey(
		access.membership.organizationId,
		normalizedInput,
	)
	if (await checkPermissionKeyExists(nextKey, permission.id)) {
		return { error: 'Ya existe un permiso personalizado con ese nombre.' }
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(permissions)
				.set({
					key: nextKey,
					slug: normalizedInput.slug,
					module: normalizedInput.module,
					name: normalizedInput.name,
					description: normalizedInput.description,
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(permissions.id, permission.id),
						eq(
							permissions.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.PERMISSION_UPDATED,
					entityType: 'permission',
					entityId: permission.id,
					oldData: {
						key: permission.key,
						slug: permission.slug,
						module: permission.module,
						name: permission.name,
						description: permission.description,
					},
					newData: {
						name: normalizedInput.name,
						module: normalizedInput.module,
						description: normalizedInput.description,
						slug: normalizedInput.slug,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar el permiso. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/permissions')
	revalidatePath('/dashboard/roles')
	return { success: true }
}

export async function $deletePermissionAction(
	id: string,
): Promise<PermissionActionResult> {
	const access = await requirePermissionsAccess('permissions.manage')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const idError = validatePermissionId(id)
	if (idError) return { error: idError }

	const permission = await getPermissionByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!permission) return { error: 'El permiso no fue encontrado.' }
	if (permission.isSystem) {
		return { error: 'Los permisos base no se pueden eliminar.' }
	}

	const usageCount = await getPermissionUsageCount(permission.id)

	try {
		await db.transaction(async (tx) => {
			await tx
				.delete(rolePermissions)
				.where(eq(rolePermissions.permissionId, permission.id))

			await tx
				.update(permissions)
				.set({
					deletedAt: new Date(),
					deletedBy: access.session.user.id,
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(permissions.id, permission.id),
						eq(
							permissions.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.PERMISSION_DELETED,
					entityType: 'permission',
					entityId: permission.id,
					oldData: {
						name: permission.name,
						module: permission.module,
						usageCount,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo eliminar el permiso. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/permissions')
	revalidatePath('/dashboard/roles')
	return { success: true }
}
