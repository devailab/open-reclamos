import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getCategoriesTableForOrganization } from '@/modules/categories/queries'
import { DEFAULT_CATEGORIES_TABLE_FILTERS } from '@/modules/categories/validation'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { CategoriesPage } from './_features/categories-page'
import type { CategoriesInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const CategoriesRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'categories.view')) redirect('/dashboard')

	const { rows, totalItems } = await getCategoriesTableForOrganization({
		organizationId: membership.organizationId,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_CATEGORIES_TABLE_FILTERS,
	})

	const initialState: CategoriesInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_CATEGORIES_TABLE_FILTERS,
	}

	return <CategoriesPage initialState={initialState} />
}

export default CategoriesRoute
