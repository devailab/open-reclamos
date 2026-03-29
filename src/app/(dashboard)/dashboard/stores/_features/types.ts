import type { StoreTableRow } from '@/modules/stores/queries'
import type { StoresTableFilters } from '@/modules/stores/validation'

export type StoreRow = StoreTableRow

export interface StoresInitialState {
	rows: StoreRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: StoresTableFilters
	organizationFormEnabled: boolean
}

export interface StoresPageProps {
	initialState: StoresInitialState
}
