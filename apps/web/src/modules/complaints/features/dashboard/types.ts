import type { DashboardTrendDays, DashboardTrendPoint } from '../../filters'
import type { ComplaintsDashboardKpis, FeaturedComplaint } from '../../types'

export interface DashboardInitialState {
	days: DashboardTrendDays
	kpis: ComplaintsDashboardKpis
	trend: DashboardTrendPoint[]
	featuredComplaints: FeaturedComplaint[]
}

export interface DashboardPageProps {
	userName: string
	initialState: DashboardInitialState
}
