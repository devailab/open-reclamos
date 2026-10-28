import { useCallback } from 'react'
import { useParams } from 'react-router'
import { useSession } from '@/shared/auth/session'
import { getCategories, getComplaintsTable, getStores } from '../api'
import { ComplaintsOverviewPage } from '../features/complaint-list/complaints-overview-page'
import { ComplaintsPage as ComplaintsTable } from '../features/complaint-list/complaints-page'
import { DEFAULT_COMPLAINTS_TABLE_FILTERS } from '../filters'
import { QueryState, useFeatureQuery } from '../hooks/use-feature-query'

export function ComplaintsPage({
	storeId: requestedStoreId,
}: {
	storeId?: string
} = {}) {
	const params = useParams<{ storeId?: string }>()
	const storeId = requestedStoreId ?? params.storeId
	const { session } = useSession()
	const organizationId = session?.organization?.id ?? session?.organization_id
	// biome-ignore lint/correctness/useExhaustiveDependencies: Cambiar de empresa invalida los datos aunque el tenant se resuelva mediante la cookie.
	const load = useCallback(
		async (signal: AbortSignal) => {
			const filters = {
				...DEFAULT_COMPLAINTS_TABLE_FILTERS,
				storeId: storeId ?? 'all',
				sort: storeId ? ('newest' as const) : ('featured' as const),
				activeOnly: !storeId,
			}

			const [table, stores, categories] = await Promise.all([
				getComplaintsTable({ page: 1, pageSize: 10, filters }, signal),
				getStores(signal),
				getCategories(signal),
			])

			return { ...table, pageSize: 10, filters, stores, categories }
		},
		[storeId, organizationId],
	)

	const query = useFeatureQuery(load)

	if (!query.data) {
		return <QueryState error={query.error} reload={query.reload} />
	}

	const { stores, categories, ...initialState } = query.data

	if (storeId) {
		const store = stores.find((store) => store.id === storeId)

		if (!store) {
			return (
				<QueryState
					error='No tienes acceso a esta tienda o ya no está activa.'
					reload={query.reload}
				/>
			)
		}

		return (
			<ComplaintsTable
				key={`${organizationId}:${storeId}`}
				initialState={{ ...initialState, store }}
				categories={categories}
				stores={stores}
			/>
		)
	}

	return (
		<ComplaintsOverviewPage
			key={String(organizationId)}
			initialState={{ ...initialState, categories }}
			stores={stores}
		/>
	)
}
