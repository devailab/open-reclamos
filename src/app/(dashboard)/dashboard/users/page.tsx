import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	getInvitationsTableForOrganization,
	getUserAccessOptionsForOrganization,
	getUsersTableForOrganization,
} from '@/modules/users/queries'
import { DEFAULT_USERS_TABLE_FILTERS } from '@/modules/users/validation'
import type { UsersInitialState } from './_features/types'
import { UsersPage } from './_features/users-page'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const UsersRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'users.view')) redirect('/dashboard')

	const [
		{ rows: users, totalItems: usersTotalItems },
		{ rows: invitations, totalItems: invitationsTotalItems },
		accessOptions,
	] = await Promise.all([
		getUsersTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_USERS_TABLE_FILTERS,
		}),
		getInvitationsTableForOrganization({
			organizationId: membership.organizationId,
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_USERS_TABLE_FILTERS,
		}),
		getUserAccessOptionsForOrganization(membership.organizationId),
	])

	const initialState: UsersInitialState = {
		users,
		usersTotalItems,
		userFilters: DEFAULT_USERS_TABLE_FILTERS,
		invitations,
		invitationsTotalItems,
		invitationFilters: DEFAULT_USERS_TABLE_FILTERS,
		roleOptions: accessOptions.rolesOptions,
		permissionOptions: accessOptions.permissionsOptions,
		storeOptions: accessOptions.storeOptions,
	}

	return <UsersPage initialState={initialState} />
}

export default UsersRoute
