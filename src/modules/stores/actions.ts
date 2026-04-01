'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { stores } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	checkStoreSlugExists,
	getOrganizationFormEnabledForOrganization,
	getStoreByIdForOrganization,
	getStoresTableForOrganization,
	type StoreTableRow,
} from './queries'
import {
	normalizeStoreMutationInput,
	normalizeStoresPagination,
	normalizeStoresTableFilters,
	type StoreMutationInput,
	type StoresTableFilters,
	validateStoreId,
	validateStoreMutationInput,
} from './validation'

export type StoreActionResult = { error: string } | { success: true }

export interface GetStoresTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<StoresTableFilters>
}

export interface GetStoresTableActionResult {
	rows: StoreTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: StoresTableFilters
	organizationFormEnabled: boolean
}

async function requireAccess(permissionKey: string) {
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

export async function $getStoresTableAction(
	input: GetStoresTableActionInput,
): Promise<GetStoresTableActionResult> {
	const access = await requireAccess('stores.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizeStoresTableFilters(),
			organizationFormEnabled: true,
		}
	}

	const { page, pageSize } = normalizeStoresPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeStoresTableFilters(input.filters)

	const { rows, totalItems } = await getStoresTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})
	const organizationFormEnabled =
		await getOrganizationFormEnabledForOrganization(
			access.membership.organizationId,
		)

	return {
		rows,
		totalItems,
		page,
		pageSize,
		filters,
		organizationFormEnabled,
	}
}

const buildStoreSlugBase = (name: string): string => {
	const base = name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)

	return base || 'tienda'
}

const getUniqueStoreSlug = async (name: string): Promise<string> => {
	const base = buildStoreSlugBase(name)
	let slug = base
	let counter = 2

	while (await checkStoreSlugExists(slug)) {
		slug = `${base}-${counter}`
		counter++
	}

	return slug
}

const buildStorePersistenceInput = (
	input: ReturnType<typeof normalizeStoreMutationInput>,
) => {
	const isPhysical = input.type === 'physical'

	return {
		name: input.name,
		type: input.type,
		ubigeoId: isPhysical ? input.ubigeoId : null,
		addressType: isPhysical ? input.addressType : null,
		address: isPhysical ? input.address : null,
		url: isPhysical ? null : input.url,
	}
}

export async function $createStoreAction(
	input: StoreMutationInput,
): Promise<StoreActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

	const normalizedInput = normalizeStoreMutationInput(input)
	const validationError = validateStoreMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const slug = await getUniqueStoreSlug(normalizedInput.name)
	const persistenceInput = buildStorePersistenceInput(normalizedInput)

	try {
		await db.transaction(async (tx) => {
			const [store] = await tx
				.insert(stores)
				.values({
					organizationId: access.membership.organizationId,
					slug,
					...persistenceInput,
					createdBy: access.session.user.id,
				})
				.returning({ id: stores.id })

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.STORE_CREATED,
					entityType: 'store',
					entityId: store.id,
					newData: persistenceInput,
				},
				tx,
			)
		})
	} catch {
		return { error: 'No se pudo crear la tienda. Inténtalo nuevamente.' }
	}

	revalidatePath('/dashboard/stores')
	revalidatePath('/s/[slug]', 'page')
	revalidatePath('/c/[slug]', 'page')
	return { success: true }
}

export type UpdateStoreActionInput = StoreMutationInput & {
	id: string
}

export async function $updateStoreAction(
	input: UpdateStoreActionInput,
): Promise<StoreActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access)
		return { error: 'No tienes permisos para realizar esta acción.' }

	const idError = validateStoreId(input.id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		input.id,
		access.membership.organizationId,
	)
	if (!currentStore) return { error: 'La tienda no fue encontrada.' }
	if (currentStore.deletedAt) {
		return { error: 'La tienda está inactiva y no se puede editar.' }
	}

	const normalizedInput = normalizeStoreMutationInput(input)
	const validationError = validateStoreMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const newData = buildStorePersistenceInput(normalizedInput)

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(stores)
				.set({
					...newData,
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(stores.id, input.id),
						eq(
							stores.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.STORE_UPDATED,
					entityType: 'store',
					entityId: input.id,
					oldData: {
						name: currentStore.name,
						type: currentStore.type,
						ubigeoId: currentStore.ubigeoId,
						addressType: currentStore.addressType,
						address: currentStore.address,
						url: currentStore.url,
					},
					newData,
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar la tienda. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/stores')
	revalidatePath('/s/[slug]', 'page')
	revalidatePath('/c/[slug]', 'page')
	return { success: true }
}

export async function $deactivateStoreAction(
	id: string,
): Promise<StoreActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access)
		return { error: 'No tienes permisos para realizar esta acción.' }

	const idError = validateStoreId(id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!currentStore) return { error: 'La tienda no fue encontrada.' }
	if (currentStore.deletedAt) {
		return { error: 'La tienda ya está inactiva.' }
	}

	class AlreadyInactiveError extends Error {}

	try {
		await db.transaction(async (tx) => {
			const now = new Date()
			const [deactivatedStore] = await tx
				.update(stores)
				.set({
					deletedAt: now,
					deletedBy: access.session.user.id,
					updatedAt: now,
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(stores.id, id),
						eq(
							stores.organizationId,
							access.membership.organizationId,
						),
						isNull(stores.deletedAt),
					),
				)
				.returning({ id: stores.id })

			if (!deactivatedStore) {
				throw new AlreadyInactiveError()
			}

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.STORE_DEACTIVATED,
					entityType: 'store',
					entityId: id,
					oldData: { deletedAt: null },
					newData: { deletedAt: now.toISOString() },
				},
				tx,
			)
		})
	} catch (e) {
		if (e instanceof AlreadyInactiveError) {
			return { error: 'La tienda ya está inactiva.' }
		}
		return {
			error: 'No se pudo desactivar la tienda. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/stores')
	revalidatePath('/s/[slug]', 'page')
	revalidatePath('/c/[slug]', 'page')
	return { success: true }
}

export async function $setStoreFormEnabledAction(
	id: string,
	formEnabled: boolean,
): Promise<StoreActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access)
		return { error: 'No tienes permisos para realizar esta acción.' }

	const idError = validateStoreId(id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!currentStore) return { error: 'La tienda no fue encontrada.' }
	if (currentStore.deletedAt) {
		return { error: 'La tienda está inactiva y no se puede editar.' }
	}
	if (currentStore.formEnabled === formEnabled) {
		return { success: true }
	}

	try {
		await db.transaction(async (tx) => {
			const now = new Date()

			const [updatedStore] = await tx
				.update(stores)
				.set({
					formEnabled,
					updatedAt: now,
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(stores.id, id),
						eq(
							stores.organizationId,
							access.membership.organizationId,
						),
						isNull(stores.deletedAt),
					),
				)
				.returning({ id: stores.id })

			if (!updatedStore) {
				throw new Error('store form toggle failed')
			}

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: formEnabled
						? AUDIT_LOG.STORE_FORM_ENABLED
						: AUDIT_LOG.STORE_FORM_DISABLED,
					entityType: 'store_form',
					entityId: id,
					oldData: { formEnabled: currentStore.formEnabled },
					newData: { formEnabled },
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar el formulario de la tienda. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/stores')
	revalidatePath('/s/[slug]', 'page')
	revalidatePath('/c/[slug]', 'page')
	return { success: true }
}
