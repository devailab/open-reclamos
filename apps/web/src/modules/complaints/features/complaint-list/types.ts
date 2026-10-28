import type { ComplaintsTableFilters } from '../../filters'
import type { ComplaintTableRow, StoreOption } from '../../types'

export type ComplaintRow = ComplaintTableRow

export interface ComplaintsInitialState {
	rows: ComplaintRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: ComplaintsTableFilters
	store: StoreOption
}

export interface ComplaintsPageProps {
	initialState: ComplaintsInitialState
	stores: import('../../types').StoreOption[]
	categories: import('../../types').ComplaintCategorySummary[]
}
