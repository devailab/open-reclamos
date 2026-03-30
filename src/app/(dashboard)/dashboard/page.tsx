import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { $getComplaintsDashboardMetricsAction } from '@/modules/complaints/dashboard-actions'
import { DashboardPage } from './_features/dashboard-page'
import type { DashboardInitialState } from './_features/types'

const DashboardRoute: FC = async () => {
	const session = await getSession()
	const metrics = await $getComplaintsDashboardMetricsAction({ days: 15 })

	const initialState: DashboardInitialState = {
		days: metrics.days,
		kpis: metrics.kpis,
		trend: metrics.trend,
	}

	return (
		<DashboardPage
			userName={session?.user.name ?? 'Usuario'}
			initialState={initialState}
		/>
	)
}

export default DashboardRoute
