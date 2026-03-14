import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
    getOrganizationForUser,
    getStoresTableForOrganization,
} from '@/modules/stores/queries'
import { DEFAULT_STORES_TABLE_FILTERS } from '@/modules/stores/validation'
import { StoresPage } from './_features/stores-page'
import type { StoresInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

const StoresRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	// Carga inicial base para la vista de tiendas.
	const { rows, totalItems } = await getStoresTableForOrganization({
		organizationId,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_STORES_TABLE_FILTERS,
	})

	const initialState: StoresInitialState = {
		rows,
		totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_STORES_TABLE_FILTERS,
	}

	return <StoresPage initialState={initialState} />
}

export default StoresRoute
