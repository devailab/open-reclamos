import type {
	ComplaintTableRow,
	StoreOption,
} from '@/modules/complaints/dashboard-queries'
import type { ComplaintsTableFilters } from '@/modules/complaints/dashboard-validation'

export type ComplaintRow = ComplaintTableRow

export interface ComplaintsInitialState {
	rows: ComplaintRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: ComplaintsTableFilters
	storeOptions: StoreOption[]
}

export interface ComplaintsPageProps {
	initialState: ComplaintsInitialState
}
