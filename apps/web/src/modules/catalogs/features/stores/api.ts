import {
	OpCreateStore,
	OpDeactivateStore,
	OpGetSettings,
	OpListStores,
	OpListUbigeos,
	OpSetStoreFormEnabled,
	OpUpdateStore,
} from '@open-reclamos/rpc-client'
import { sileo } from 'sileo'
import type { RPCMethod } from '@/shared/api/rpc'
import { rpc } from '@/shared/api/rpc'
import { type StoreDTO, type StoreRow, toStoreRow } from './types'
import {
	normalizeStoreMutationInput,
	type StoreMutationInput,
	type StoresTableFilters,
} from './validation'

interface Page<T> {
	rows?: T[] | null
	total: number
	page: number
	page_size: number
}

export type UpdateStoreActionInput = StoreMutationInput & { id: string }

async function mutation(
	method: RPCMethod,
	id?: string,
	data?: Record<string, unknown>,
) {
	try {
		await rpc(method, { id, data })

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo guardar la tienda.',
		}
	}
}

function payload(input: StoreMutationInput) {
	const d = normalizeStoreMutationInput(input)

	return {
		name: d.name,
		slug: d.slug,
		type: d.type,
		color: d.color,
		ubigeo_id: d.ubigeoId,
		address_type: d.addressType,
		address: d.address,
		url: d.url,
	}
}

export const createStore = (input: StoreMutationInput) =>
	mutation(OpCreateStore, undefined, payload(input))

export const updateStore = (input: UpdateStoreActionInput) =>
	mutation(OpUpdateStore, input.id, payload(input))

export const deactivateStore = (id: string) => mutation(OpDeactivateStore, id)

export const setStoreFormEnabled = (id: string, enabled: boolean) =>
	mutation(OpSetStoreFormEnabled, id, { form_enabled: enabled })

export async function getStoresTable(input: {
	page: number
	pageSize: number
	filters?: StoresTableFilters
}): Promise<{
	rows: StoreRow[]
	totalItems: number
	page: number
	organizationFormEnabled: boolean
}> {
	try {
		const [result, settings] = await Promise.all([
			rpc<Page<StoreDTO>>(OpListStores, {
				...input,
				filters: { ...input.filters },
			}),
			rpc<{ form_enabled: boolean }>(OpGetSettings),
		])

		const lastPage = Math.max(
			1,
			Math.ceil((result.total ?? 0) / input.pageSize),
		)

		if (input.page > lastPage) {
			return getStoresTable({ ...input, page: lastPage })
		}

		return {
			rows: (result.rows ?? []).map(toStoreRow),
			totalItems: result.total ?? 0,
			page: result.page ?? input.page,
			organizationFormEnabled: settings.form_enabled === true,
		}
	} catch (error) {
		sileo.error({
			title: 'Error al cargar tiendas',
			description:
				error instanceof Error
					? error.message
					: 'Inténtalo nuevamente.',
		})

		throw error
	}
}

export async function searchUbigeos(search: string) {
	const result = await rpc<
		Page<{
			id: string
			department: string
			province: string
			district: string
		}>
	>(OpListUbigeos, { filters: { search }, page: 1, pageSize: 100 })

	return (result.rows ?? []).map((row) => ({
		value: row.id,
		label: `${row.department} / ${row.province} / ${row.district}`,
	}))
}
