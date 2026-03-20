import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getAuditLogsTableForOrganization,
	getOrganizationForUser,
} from '@/modules/audit/queries'
import { createDefaultAuditTableFilters } from '@/modules/audit/validation'
import { AuditPage } from './_features/audit-page'
import type { AuditInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const AuditRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const defaultFilters = createDefaultAuditTableFilters()
	const { rows, totalItems } = await getAuditLogsTableForOrganization({
		organizationId,
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
