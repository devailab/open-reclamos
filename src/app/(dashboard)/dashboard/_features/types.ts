import type { ComplaintsDashboardKpis } from '@/modules/complaints/dashboard-queries'
import type {
	DashboardTrendDays,
	DashboardTrendPoint,
} from '@/modules/complaints/dashboard-validation'

export interface DashboardInitialState {
	days: DashboardTrendDays
	kpis: ComplaintsDashboardKpis
	trend: DashboardTrendPoint[]
}

export interface DashboardPageProps {
	userName: string
	initialState: DashboardInitialState
}
