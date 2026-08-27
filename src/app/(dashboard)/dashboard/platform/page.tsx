import type { FC } from 'react'
import {
	getOrganizationsTableForPlatform,
	getPlatformOverviewMetrics,
} from '@/modules/platform/queries'
import { DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS } from '@/modules/platform/validation'
import { PlatformPage } from './_features/platform-page'
import type { PlatformInitialState } from './_features/types'

const INITIAL_PAGE = 1
const INITIAL_PAGE_SIZE = 10

// El guard de super admin vive en el layout de la sección.
const PlatformRoute: FC = async () => {
	const [metrics, table] = await Promise.all([
		getPlatformOverviewMetrics(),
		getOrganizationsTableForPlatform({
			page: INITIAL_PAGE,
			pageSize: INITIAL_PAGE_SIZE,
			filters: DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
		}),
	])

	const initialState: PlatformInitialState = {
		metrics,
		rows: table.rows,
		totalItems: table.totalItems,
		page: INITIAL_PAGE,
		pageSize: INITIAL_PAGE_SIZE,
		filters: DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
	}

	return <PlatformPage initialState={initialState} />
}

export default PlatformRoute
