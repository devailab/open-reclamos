'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/database/database'
import { stores } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { buildSlugBase, resolveUniqueSlug } from '@/lib/slug'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import type { ActionResult } from '@/modules/shared/types'
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

const getUniqueStoreSlug = (name: string): Promise<string> =>
	resolveUniqueSlug(buildSlugBase(name, 'tienda'), checkStoreSlugExists)

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
): Promise<ActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access) return { error: access.error }

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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.STORE_CREATED,
				entityType: 'store',
				entityId: store.id,
				newData: persistenceInput,
			})
		})
	} catch {
		return { error: MESSAGES.stores.createFailed }
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
): Promise<ActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access) return { error: access.error }

	const idError = validateStoreId(input.id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		input.id,
		access.membership.organizationId,
	)
	if (!currentStore) return { error: MESSAGES.stores.notFound }
	if (currentStore.deletedAt) {
		return { error: MESSAGES.stores.inactiveNotEditable }
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

			await createAuditLog({
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
			})
		})
	} catch {
		return {
			error: MESSAGES.stores.updateFailed,
		}
	}

	revalidatePath('/dashboard/stores')
	revalidatePath('/s/[slug]', 'page')
	revalidatePath('/c/[slug]', 'page')
	return { success: true }
}

export async function $deactivateStoreAction(
	id: string,
): Promise<ActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access) return { error: access.error }

	const idError = validateStoreId(id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!currentStore) return { error: MESSAGES.stores.notFound }
	if (currentStore.deletedAt) {
		return { error: MESSAGES.stores.alreadyInactive }
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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.STORE_DEACTIVATED,
				entityType: 'store',
				entityId: id,
				oldData: { deletedAt: null },
				newData: { deletedAt: now.toISOString() },
			})
		})
	} catch (e) {
		if (e instanceof AlreadyInactiveError) {
			return { error: MESSAGES.stores.alreadyInactive }
		}
		return {
			error: MESSAGES.stores.deactivateFailed,
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
): Promise<ActionResult> {
	const access = await requireAccess('stores.manage')
	if ('error' in access) return { error: access.error }

	const idError = validateStoreId(id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!currentStore) return { error: MESSAGES.stores.notFound }
	if (currentStore.deletedAt) {
		return { error: MESSAGES.stores.inactiveNotEditable }
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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: formEnabled
					? AUDIT_LOG.STORE_FORM_ENABLED
					: AUDIT_LOG.STORE_FORM_DISABLED,
				entityType: 'store_form',
				entityId: id,
				oldData: { formEnabled: currentStore.formEnabled },
				newData: { formEnabled },
			})
		})
	} catch {
		return {
			error: MESSAGES.stores.formUpdateFailed,
		}
	}

	revalidatePath('/dashboard/stores')
	revalidatePath('/s/[slug]', 'page')
	revalidatePath('/c/[slug]', 'page')
	return { success: true }
}
