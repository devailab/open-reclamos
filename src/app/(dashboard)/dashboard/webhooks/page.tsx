import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { getWebhooksTableForOrganization } from '@/modules/webhooks/queries'
import { DEFAULT_WEBHOOKS_TABLE_FILTERS } from '@/modules/webhooks/validation'
import type { WebhooksInitialState } from './_features/types'
import { WebhooksPage } from './_features/webhooks-page'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const WebhooksRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'webhooks.view')) redirect('/dashboard')

	const { rows, totalItems } = await getWebhooksTableForOrganization({
		organizationId: membership.organizationId,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_WEBHOOKS_TABLE_FILTERS,
	})

	const initialState: WebhooksInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_WEBHOOKS_TABLE_FILTERS,
	}

	return <WebhooksPage initialState={initialState} />
}

export default WebhooksRoute
