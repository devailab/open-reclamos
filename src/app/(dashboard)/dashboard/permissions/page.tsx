import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getPermissionModuleOptionsForOrganization,
	getPermissionsTableForOrganization,
} from '@/modules/permissions/queries'
import { DEFAULT_PERMISSIONS_TABLE_FILTERS } from '@/modules/permissions/validation'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { PermissionsPage } from './_features/permissions-page'
import type { PermissionsInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const PermissionsRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'permissions.view')) {
		redirect('/dashboard')
	}

	const [{ rows, totalItems }, moduleOptions] = await Promise.all([
		getPermissionsTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_PERMISSIONS_TABLE_FILTERS,
		}),
		getPermissionModuleOptionsForOrganization(membership.organizationId),
	])

	const initialState: PermissionsInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_PERMISSIONS_TABLE_FILTERS,
		moduleOptions,
	}

	return <PermissionsPage initialState={initialState} />
}

export default PermissionsRoute
