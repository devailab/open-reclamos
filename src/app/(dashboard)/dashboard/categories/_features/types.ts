import type { ComplaintCategoryRow } from '@/modules/categories/queries'
import type { CategoriesTableFilters } from '@/modules/categories/validation'

export type CategoryRow = ComplaintCategoryRow

export interface CategoriesInitialState {
	rows: CategoryRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: CategoriesTableFilters
}

export interface CategoriesPageProps {
	initialState: CategoriesInitialState
}
