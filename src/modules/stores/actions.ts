'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { stores } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import {
	checkStoreSlugExists,
	getOrganizationForUser,
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
}

export async function $getStoresTableAction(
	input: GetStoresTableActionInput,
): Promise<GetStoresTableActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	// Normaliza paginación/filtros antes de consultar.
	const { page, pageSize } = normalizeStoresPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeStoresTableFilters(input.filters)

	const { rows, totalItems } = await getStoresTableForOrganization({
		organizationId,
		page,
		pageSize,
		filters,
	})

	return {
		rows,
		totalItems,
		page,
		pageSize,
		filters,
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
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId)
		return { error: 'No se encontró una organización asociada.' }

	const normalizedInput = normalizeStoreMutationInput(input)
	const validationError = validateStoreMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const slug = await getUniqueStoreSlug(normalizedInput.name)

	try {
		await db.insert(stores).values({
			organizationId,
			slug,
			...buildStorePersistenceInput(normalizedInput),
			createdBy: session.user.id,
		})
	} catch {
		return { error: 'No se pudo crear la tienda. Inténtalo nuevamente.' }
	}

	// Refresca el listado del dashboard.
	revalidatePath('/dashboard/stores')
	return { success: true }
}

export type UpdateStoreActionInput = StoreMutationInput & {
	id: string
}

export async function $updateStoreAction(
	input: UpdateStoreActionInput,
): Promise<StoreActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId)
		return { error: 'No se encontró una organización asociada.' }

	const idError = validateStoreId(input.id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(
		input.id,
		organizationId,
	)
	if (!currentStore) return { error: 'La tienda no fue encontrada.' }
	if (currentStore.deletedAt) {
		return { error: 'La tienda está inactiva y no se puede editar.' }
	}

	const normalizedInput = normalizeStoreMutationInput(input)
	const validationError = validateStoreMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	try {
		await db
			.update(stores)
			.set({
				...buildStorePersistenceInput(normalizedInput),
				updatedAt: new Date(),
				updatedBy: session.user.id,
			})
			.where(
				and(
					eq(stores.id, input.id),
					eq(stores.organizationId, organizationId),
				),
			)
	} catch {
		return {
			error: 'No se pudo actualizar la tienda. Inténtalo nuevamente.',
		}
	}

	// Refresca el listado del dashboard.
	revalidatePath('/dashboard/stores')
	return { success: true }
}

export async function $deactivateStoreAction(
	id: string,
): Promise<StoreActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId)
		return { error: 'No se encontró una organización asociada.' }

	const idError = validateStoreId(id)
	if (idError) return { error: idError }

	const currentStore = await getStoreByIdForOrganization(id, organizationId)
	if (!currentStore) return { error: 'La tienda no fue encontrada.' }
	if (currentStore.deletedAt) {
		return { error: 'La tienda ya está inactiva.' }
	}

	try {
		const [deactivatedStore] = await db
			.update(stores)
			.set({
				deletedAt: new Date(),
				deletedBy: session.user.id,
				updatedAt: new Date(),
				updatedBy: session.user.id,
			})
			.where(
				and(
					eq(stores.id, id),
					eq(stores.organizationId, organizationId),
					isNull(stores.deletedAt),
				),
			)
			.returning({ id: stores.id })

		if (!deactivatedStore) {
			return { error: 'La tienda ya está inactiva.' }
		}
	} catch {
		return {
			error: 'No se pudo desactivar la tienda. Inténtalo nuevamente.',
		}
	}

	// Refresca el listado del dashboard.
	revalidatePath('/dashboard/stores')
	return { success: true }
}
