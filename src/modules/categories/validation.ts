const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 500

export interface CategoriesTableFilters {
	search: string
}

export interface CategoryMutationInput {
	name: string
	description: string | null
}

export interface NormalizedCategoryMutationInput {
	name: string
	description: string | null
}

export const DEFAULT_CATEGORIES_TABLE_FILTERS: CategoriesTableFilters = {
	search: '',
}

const normalizeOptionalString = (
	value: string | null | undefined,
): string | null => {
	const trimmed = value?.trim() ?? ''
	return trimmed.length > 0 ? trimmed : null
}

export const normalizeCategoryMutationInput = (
	input: CategoryMutationInput,
): NormalizedCategoryMutationInput => {
	return {
		name: input.name.trim(),
		description: normalizeOptionalString(input.description),
	}
}

export const validateCategoryMutationInput = (
	input: NormalizedCategoryMutationInput,
): string | null => {
	if (!input.name) {
		return 'El nombre de la categoría es requerido.'
	}

	if (input.name.length < 2) {
		return 'La categoría debe tener al menos 2 caracteres.'
	}

	if (input.name.length > MAX_NAME_LENGTH) {
		return 'La categoría no puede superar los 120 caracteres.'
	}

	if (
		input.description &&
		input.description.length > MAX_DESCRIPTION_LENGTH
	) {
		return 'La descripción no puede superar los 500 caracteres.'
	}

	return null
}

export const normalizeCategoriesTableFilters = (
	filters?: Partial<CategoriesTableFilters>,
): CategoriesTableFilters => {
	return {
		search: (filters?.search ?? '').trim().slice(0, MAX_NAME_LENGTH),
	}
}

export const normalizeCategoriesPagination = (
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
