'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { getOrganizationForUser } from '@/modules/stores/queries'
import {
	type ComplaintsDashboardKpis,
	type ComplaintTableRow,
	getComplaintsDailyTrendForOrganization,
	getComplaintsDashboardKpisForOrganization,
	getComplaintsTableForOrganization,
} from './dashboard-queries'
import {
	type ComplaintsTableFilters,
	type DashboardTrendDays,
	type DashboardTrendPoint,
	normalizeComplaintsPagination,
	normalizeComplaintsTableFilters,
	normalizeDashboardTrendDays,
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

export interface GetComplaintsDashboardMetricsActionInput {
	days?: number
}

export interface GetComplaintsDashboardMetricsActionResult {
	days: DashboardTrendDays
	kpis: ComplaintsDashboardKpis
	trend: DashboardTrendPoint[]
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

export async function $getComplaintsDashboardMetricsAction(
	input: GetComplaintsDashboardMetricsActionInput = {},
): Promise<GetComplaintsDashboardMetricsActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const days = normalizeDashboardTrendDays(input.days)

	const [kpis, trend] = await Promise.all([
		getComplaintsDashboardKpisForOrganization(organizationId),
		getComplaintsDailyTrendForOrganization(organizationId, days),
	])

	return { days, kpis, trend }
}
