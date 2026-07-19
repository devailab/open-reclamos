'use server'

import { requireAccess } from '@/modules/shared/access'
import {
	type ComplaintsDashboardKpis,
	type ComplaintTableRow,
	type FeaturedComplaint,
	getComplaintsDailyTrendForOrganization,
	getComplaintsDashboardKpisForOrganization,
	getComplaintsTableForOrganization,
	getFeaturedComplaintsForOrganization,
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

export type GetComplaintsOverviewActionInput = GetComplaintsTableActionInput

function resolveAllowedStoreIds(
	storeAccessMode: 'all' | 'selected',
	storeIds: string[],
): string[] | undefined {
	return storeAccessMode === 'selected' ? storeIds : undefined
}

export async function $getComplaintsTableAction(
	input: GetComplaintsTableActionInput,
): Promise<GetComplaintsTableActionResult> {
	const access = await requireAccess('complaints.view')

	const { page, pageSize } = normalizeComplaintsPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeComplaintsTableFilters(input.filters)

	if ('error' in access) {
		return { rows: [], totalItems: 0, page, pageSize, filters }
	}

	const allowedStoreIds = resolveAllowedStoreIds(
		access.membership.storeAccessMode,
		access.membership.storeIds,
	)

	const { rows, totalItems } = await getComplaintsTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
		allowedStoreIds,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $getComplaintsOverviewAction(
	input: GetComplaintsOverviewActionInput,
): Promise<GetComplaintsTableActionResult> {
	const access = await requireAccess('complaints.view')

	const { page, pageSize } = normalizeComplaintsPagination(
		input.page,
		input.pageSize,
	)
	const filters = {
		...normalizeComplaintsTableFilters(input.filters),
		// La vista general siempre reúne todas las tiendas accesibles y todos
		// los estados pendientes; esos alcances no dependen del cliente.
		storeId: 'all',
		status: 'all' as const,
	}

	if ('error' in access) {
		return { rows: [], totalItems: 0, page, pageSize, filters }
	}

	const allowedStoreIds = resolveAllowedStoreIds(
		access.membership.storeAccessMode,
		access.membership.storeIds,
	)
	const { rows, totalItems } = await getComplaintsTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
		allowedStoreIds,
		activeOnly: true,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $getComplaintsDashboardMetricsAction(
	input: GetComplaintsDashboardMetricsActionInput = {},
): Promise<GetComplaintsDashboardMetricsActionResult> {
	const days = normalizeDashboardTrendDays(input.days)

	const access = await requireAccess('complaints.view')
	if ('error' in access) {
		return {
			days,
			kpis: { total: 0, open: 0, inReview: 0, resolved: 0, overdue: 0 },
			trend: [],
		}
	}
	const { membership } = access

	const allowedStoreIds = resolveAllowedStoreIds(
		membership.storeAccessMode,
		membership.storeIds,
	)

	const [kpis, trend] = await Promise.all([
		getComplaintsDashboardKpisForOrganization(
			membership.organizationId,
			allowedStoreIds,
		),
		getComplaintsDailyTrendForOrganization(
			membership.organizationId,
			days,
			allowedStoreIds,
		),
	])

	return { days, kpis, trend }
}

export async function $getFeaturedComplaintsAction(): Promise<
	FeaturedComplaint[]
> {
	const access = await requireAccess('complaints.view')
	if ('error' in access) {
		return []
	}
	const { membership } = access

	const allowedStoreIds = resolveAllowedStoreIds(
		membership.storeAccessMode,
		membership.storeIds,
	)

	return getFeaturedComplaintsForOrganization(
		membership.organizationId,
		allowedStoreIds,
	)
}
