import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getAuditLogsTableForOrganization } from '@/modules/audit/queries'
import { createDefaultAuditTableFilters } from '@/modules/audit/validation'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { AuditPage } from './_features/audit-page'
import type { AuditInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const AuditRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'audit.view')) redirect('/dashboard')

	const defaultFilters = createDefaultAuditTableFilters()
	const { rows, totalItems } = await getAuditLogsTableForOrganization({
		organizationId: membership.organizationId,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: defaultFilters,
	})

	const initialState: AuditInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: defaultFilters,
	}

	return <AuditPage initialState={initialState} />
}

export default AuditRoute
