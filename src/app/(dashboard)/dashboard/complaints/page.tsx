import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getComplaintsTableForOrganization,
	getStoreOptionsForOrganization,
} from '@/modules/complaints/dashboard-queries'
import { DEFAULT_COMPLAINTS_TABLE_FILTERS } from '@/modules/complaints/dashboard-validation'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { ComplaintsPage } from './_features/complaints-page'
import type { ComplaintsInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

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

	const [{ rows, totalItems }, storeOptions] = await Promise.all([
		getComplaintsTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_COMPLAINTS_TABLE_FILTERS,
			allowedStoreIds,
		}),
		getStoreOptionsForOrganization(
			membership.organizationId,
			allowedStoreIds,
		),
	])

	const initialState: ComplaintsInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_COMPLAINTS_TABLE_FILTERS,
		storeOptions,
	}

	return <ComplaintsPage initialState={initialState} />
}

export default ComplaintsRoute
