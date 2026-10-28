import type { ComplaintsTableFilters } from '../../filters'
import type { ComplaintCategorySummary, ComplaintTableRow } from '../../types'

export interface ComplaintsOverviewInitialState {
	rows: ComplaintTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: ComplaintsTableFilters
	categories: ComplaintCategorySummary[]
}

export interface ComplaintsOverviewPageProps {
	initialState: ComplaintsOverviewInitialState
	stores: import('../../types').StoreOption[]
}
