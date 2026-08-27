import type {
	PlatformOrganizationRow,
	PlatformOverviewMetrics,
} from '@/modules/platform/queries'
import type { PlatformOrganizationsTableFilters } from '@/modules/platform/validation'

export type OrganizationRow = PlatformOrganizationRow

export interface PlatformInitialState {
	metrics: PlatformOverviewMetrics
	rows: OrganizationRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: PlatformOrganizationsTableFilters
}

export interface PlatformPageProps {
	initialState: PlatformInitialState
}
