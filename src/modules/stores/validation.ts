export const STORE_TYPES = ['physical', 'virtual'] as const
export type StoreType = (typeof STORE_TYPES)[number]

export const STORE_TYPE_FILTERS = ['all', 'physical', 'virtual'] as const
export type StoreTypeFilter = (typeof STORE_TYPE_FILTERS)[number]

export const STORE_STATUS_FILTERS = ['all', 'active', 'inactive'] as const
export type StoreStatusFilter = (typeof STORE_STATUS_FILTERS)[number]

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120

export interface StoresTableFilters {
	name: string
	type: StoreTypeFilter
	status: StoreStatusFilter
}

export interface StoreMutationInput {
	name: string
	type: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
}

export interface NormalizedStoreMutationInput {
	name: string
	type: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
}

export const DEFAULT_STORES_TABLE_FILTERS: StoresTableFilters = {
	name: '',
	type: 'all',
	status: 'active',
}

const normalizeOptionalString = (
	value: string | null | undefined,
): string | null => {
	const trimmed = value?.trim() ?? ''
	return trimmed.length > 0 ? trimmed : null
}

export const isStoreType = (value: string): value is StoreType => {
	return STORE_TYPES.includes(value as StoreType)
}

const isStoreTypeFilter = (value: string): value is StoreTypeFilter => {
	return STORE_TYPE_FILTERS.includes(value as StoreTypeFilter)
}

const isStoreStatusFilter = (value: string): value is StoreStatusFilter => {
	return STORE_STATUS_FILTERS.includes(value as StoreStatusFilter)
}

export const normalizeStoreMutationInput = (
	input: StoreMutationInput,
): NormalizedStoreMutationInput => {
	return {
		name: input.name.trim(),
		type: input.type.trim(),
		ubigeoId: normalizeOptionalString(input.ubigeoId),
		addressType: normalizeOptionalString(input.addressType),
		address: normalizeOptionalString(input.address),
		url: normalizeOptionalString(input.url),
	}
}

export const validateStoreId = (value: string): string | null => {
	if (!value || value.trim() === '') {
		return 'La tienda es requerida.'
	}

	if (!/^[0-9a-fA-F-]{36}$/.test(value.trim())) {
		return 'El identificador de tienda no es válido.'
	}

	return null
}

export const validateStoreMutationInput = (
	input: NormalizedStoreMutationInput,
): string | null => {
	if (!input.name) {
		return 'El nombre de la tienda es requerido.'
	}

	if (input.name.length < 3) {
		return 'El nombre de la tienda debe tener al menos 3 caracteres.'
	}

	if (input.name.length > MAX_NAME_LENGTH) {
		return 'El nombre de la tienda no puede superar los 120 caracteres.'
	}

	if (!isStoreType(input.type)) {
		return 'El tipo de tienda no es válido.'
	}

	if (input.type === 'physical') {
		if (!input.ubigeoId) return 'El distrito de la tienda es requerido.'
		if (!input.addressType) return 'El tipo de vía es requerido.'
		if (!input.address) return 'La dirección de la tienda es requerida.'
	}

	if (input.url) {
		try {
			const parsed = new URL(input.url)
			if (!['http:', 'https:'].includes(parsed.protocol)) {
				return 'La URL de la tienda debe iniciar con http:// o https://.'
			}
		} catch {
			return 'La URL de la tienda no es válida.'
		}
	}

	return null
}

export const normalizeStoresTableFilters = (
	filters?: Partial<StoresTableFilters>,
): StoresTableFilters => {
	const normalizedName = (filters?.name ?? '')
		.trim()
		.slice(0, MAX_NAME_LENGTH)
	// Evita que TypeScript interprete `filters` como posiblemente undefined en ramas del ternario.
	const requestedType = filters?.type
	const requestedStatus = filters?.status

	const normalizedType = isStoreTypeFilter(requestedType ?? '')
		? (requestedType ?? DEFAULT_STORES_TABLE_FILTERS.type)
		: DEFAULT_STORES_TABLE_FILTERS.type

	const normalizedStatus = isStoreStatusFilter(requestedStatus ?? '')
		? (requestedStatus ?? DEFAULT_STORES_TABLE_FILTERS.status)
		: DEFAULT_STORES_TABLE_FILTERS.status

	return {
		name: normalizedName,
		type: normalizedType,
		status: normalizedStatus,
	}
}

export const normalizeStoresPagination = (
	page: number,
	pageSize: number,
): { page: number; pageSize: number } => {
	const normalizedPage =
		Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE

	const normalizedPageSize =
		Number.isFinite(pageSize) && pageSize > 0
			? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE)
			: DEFAULT_PAGE_SIZE

	return {
		page: normalizedPage,
		pageSize: normalizedPageSize,
	}
}
