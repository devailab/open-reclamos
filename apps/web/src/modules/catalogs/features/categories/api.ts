import {
	MsgInvalidData,
	OpCreateCategory,
	OpDeleteCategory,
	OpListCategories,
	OpUpdateCategory,
} from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'
import type { CategoryDTO, CategoryRow } from './types'
import {
	type CategoriesTableFilters,
	type CategoryMutationInput,
	normalizeCategoriesPagination,
	normalizeCategoriesTableFilters,
	normalizeCategoryMutationInput,
	validateCategoryMutationInput,
} from './validation'

async function saveCategory(
	input: CategoryMutationInput & { id?: string },
	signal?: AbortSignal,
) {
	const data = normalizeCategoryMutationInput(input)
	const error = validateCategoryMutationInput(data)

	if (error) {
		return { error }
	}

	await rpc(
		input.id ? OpUpdateCategory : OpCreateCategory,
		{ id: input.id, data: { ...data } },
		signal,
	)

	return { success: true as const }
}

export const createCategory = saveCategory
export const updateCategory = saveCategory

export async function deleteCategory(id: string, signal?: AbortSignal) {
	await rpc(OpDeleteCategory, { id }, signal)

	return { success: true as const }
}

function categoryRow(value: unknown): CategoryRow {
	if (!value || typeof value !== 'object') {
		throw new Error(MsgInvalidData)
	}

	const row = value as Partial<CategoryDTO>

	if (
		typeof row.id !== 'string' ||
		typeof row.name !== 'string' ||
		typeof row.created_at !== 'string' ||
		!(row.description == null || typeof row.description === 'string') ||
		!(row.updated_at == null || typeof row.updated_at === 'string')
	) {
		throw new Error(MsgInvalidData)
	}

	return {
		id: row.id,
		name: row.name,
		description: row.description ?? null,
		createdAt: row.created_at,
		updatedAt: row.updated_at ?? null,
	}
}

export async function listCategories(
	input: { page: number; pageSize: number; filters?: CategoriesTableFilters },
	signal?: AbortSignal,
): Promise<{
	rows: CategoryRow[]
	totalItems: number
	page: number
	pageSize: number
}> {
	const pagination = normalizeCategoriesPagination(input.page, input.pageSize)

	const result = await rpc<{
		rows?: unknown[] | null
		total: number
		page: number
	}>(
		OpListCategories,
		{
			...pagination,
			filters: { ...normalizeCategoriesTableFilters(input.filters) },
		},
		signal,
	)

	signal?.throwIfAborted()

	if (
		!Number.isInteger(result.total) ||
		result.total < 0 ||
		!Number.isInteger(result.page) ||
		result.page < 1 ||
		!(result.rows == null || Array.isArray(result.rows))
	) {
		throw new Error(MsgInvalidData)
	}

	const lastPage = Math.max(1, Math.ceil(result.total / pagination.pageSize))

	if (pagination.page > lastPage) {
		return listCategories({ ...input, page: lastPage }, signal)
	}

	return {
		rows: (result.rows ?? []).map(categoryRow),
		totalItems: result.total,
		page: result.page,
		pageSize: pagination.pageSize,
	}
}
