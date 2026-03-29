import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getMembershipContext,
	getPermissionOptionsForOrganization,
	hasPermission,
} from '@/modules/rbac/queries'
import { getRolesTableForOrganization } from '@/modules/roles/queries'
import { DEFAULT_ROLES_TABLE_FILTERS } from '@/modules/roles/validation'
import { RolesPage } from './_features/roles-page'
import type { RolesInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const RolesRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'roles.view')) redirect('/dashboard')

	const [{ rows, totalItems }, permissions] = await Promise.all([
		getRolesTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_ROLES_TABLE_FILTERS,
		}),
		getPermissionOptionsForOrganization(membership.organizationId),
	])

	const initialState: RolesInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_ROLES_TABLE_FILTERS,
		permissions,
	}

	return <RolesPage initialState={initialState} />
}

export default RolesRoute
