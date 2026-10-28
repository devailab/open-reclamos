import { useCallback } from 'react'
import { useSession } from '@/shared/auth/session'
import { getComplaintsDashboardMetrics, getFeatured } from '../api'
import { DashboardPage as Dashboard } from '../features/dashboard/dashboard-page'
import { QueryState, useFeatureQuery } from '../hooks/use-feature-query'

export function DashboardPage() {
	const { session } = useSession()
	const organizationId = session?.organization?.id ?? session?.organization_id
	// biome-ignore lint/correctness/useExhaustiveDependencies: Cambiar de empresa invalida los datos aunque el tenant se resuelva mediante la cookie.
	const load = useCallback(
		async (signal: AbortSignal) => {
			const [metrics, featuredComplaints] = await Promise.all([
				getComplaintsDashboardMetrics({ days: 15 }, signal),
				getFeatured(signal),
			])

			return { ...metrics, featuredComplaints }
		},
		[organizationId],
	)

	const query = useFeatureQuery(load)

	if (!query.data) {
		return <QueryState error={query.error} reload={query.reload} />
	}

	return (
		<Dashboard
			key={String(organizationId)}
			userName={session?.user?.name ?? ''}
			initialState={query.data}
		/>
	)
}
