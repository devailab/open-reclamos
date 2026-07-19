import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getComplaintCategoriesForOrganization } from '@/modules/categories/queries'
import { getComplaintsTableForOrganization } from '@/modules/complaints/dashboard-queries'
import { DEFAULT_COMPLAINTS_TABLE_FILTERS } from '@/modules/complaints/dashboard-validation'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { ComplaintsOverviewPage } from './_features/complaints-overview-page'
import type { ComplaintsOverviewInitialState } from './_features/overview-types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 16

const ComplaintsRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'complaints.view')) redirect('/dashboard')

	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined
	const filters = {
		...DEFAULT_COMPLAINTS_TABLE_FILTERS,
		sort: 'featured' as const,
	}

	const [{ rows, totalItems }, categories] = await Promise.all([
		getComplaintsTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters,
			allowedStoreIds,
			activeOnly: true,
		}),
		getComplaintCategoriesForOrganization(membership.organizationId),
	])

	const initialState: ComplaintsOverviewInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters,
		categories,
	}

	return <ComplaintsOverviewPage initialState={initialState} />
}

export default ComplaintsRoute
