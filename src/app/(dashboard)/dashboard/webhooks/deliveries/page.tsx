import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	getDeliveriesTableForOrganization,
	getEndpointSelectOptions,
} from '@/modules/webhooks/queries'
import { DEFAULT_DELIVERIES_TABLE_FILTERS } from '@/modules/webhooks/validation'
import { DeliveriesPage } from './_features/deliveries-page'
import type { DeliveriesInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 20

const DeliveriesRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'webhooks.view')) redirect('/dashboard')

	const [{ rows, totalItems }, endpointOptions] = await Promise.all([
		getDeliveriesTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_DELIVERIES_TABLE_FILTERS,
		}),
		getEndpointSelectOptions(membership.organizationId),
	])

	const initialState: DeliveriesInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_DELIVERIES_TABLE_FILTERS,
		endpointOptions,
	}

	return <DeliveriesPage initialState={initialState} />
}

export default DeliveriesRoute
