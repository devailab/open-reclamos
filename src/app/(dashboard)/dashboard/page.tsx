import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	$getComplaintsDashboardMetricsAction,
	$getFeaturedComplaintsAction,
} from '@/modules/complaints/dashboard-actions'
import { DashboardPage } from './_features/dashboard-page'
import type { DashboardInitialState } from './_features/types'

const DashboardRoute: FC = async () => {
	const session = await getSession()
	const [metrics, featuredComplaints] = await Promise.all([
		$getComplaintsDashboardMetricsAction({ days: 15 }),
		$getFeaturedComplaintsAction(),
	])

	const initialState: DashboardInitialState = {
		days: metrics.days,
		kpis: metrics.kpis,
		trend: metrics.trend,
		featuredComplaints,
	}

	return (
		<DashboardPage
			userName={session?.user.name ?? 'Usuario'}
			initialState={initialState}
		/>
	)
}

export default DashboardRoute
