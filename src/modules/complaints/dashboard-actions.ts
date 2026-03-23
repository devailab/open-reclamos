'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { getOrganizationForUser } from '@/modules/stores/queries'
import {
	getComplaintsTableForOrganization,
	type ComplaintTableRow,
} from './dashboard-queries'
import {
	normalizeComplaintsPagination,
	normalizeComplaintsTableFilters,
	type ComplaintsTableFilters,
} from './dashboard-validation'

export interface GetComplaintsTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<ComplaintsTableFilters>
}

export interface GetComplaintsTableActionResult {
	rows: ComplaintTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: ComplaintsTableFilters
}

export async function $getComplaintsTableAction(
	input: GetComplaintsTableActionInput,
): Promise<GetComplaintsTableActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const { page, pageSize } = normalizeComplaintsPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeComplaintsTableFilters(input.filters)

	const { rows, totalItems } = await getComplaintsTableForOrganization({
		organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}
