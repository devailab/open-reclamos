import type {
	ComplaintCategorySummary,
	ComplaintTableRow,
} from '@/modules/complaints/dashboard-queries'
import type { ComplaintsTableFilters } from '@/modules/complaints/dashboard-validation'

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
}
