const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120

export interface PermissionsTableFilters {
	search: string
	module: string
}

export const DEFAULT_PERMISSIONS_TABLE_FILTERS: PermissionsTableFilters = {
	search: '',
	module: 'all',
}

export const normalizePermissionsTableFilters = (
	filters?: Partial<PermissionsTableFilters>,
): PermissionsTableFilters => {
	return {
		search: (filters?.search ?? '').trim().slice(0, MAX_NAME_LENGTH),
		module: (filters?.module ?? 'all').trim().toLowerCase() || 'all',
	}
}

export const normalizePermissionsPagination = (
	page: number,
	pageSize: number,
) => {
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
