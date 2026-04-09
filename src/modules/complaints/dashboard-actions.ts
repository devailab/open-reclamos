'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
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

async function requireAccess(permissionKey: string) {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return {
			error: 'No tienes permisos para realizar esta acción.',
		} as const
	}

	return { session, membership } as const
}

/**
 * Devuelve los IDs de tiendas permitidas para el usuario.
 * undefined = acceso a todas las tiendas; string[] = solo esas tiendas.
 */
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

export async function $getComplaintsDashboardMetricsAction(
	input: GetComplaintsDashboardMetricsActionInput = {},
): Promise<GetComplaintsDashboardMetricsActionResult> {
	const days = normalizeDashboardTrendDays(input.days)

	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	// El dashboard principal es accesible a todos, pero solo muestra métricas
	// si el usuario tiene complaints.view. Si no, devuelve ceros.
	if (!hasPermission(membership, 'complaints.view')) {
		return {
			days,
			kpis: { total: 0, open: 0, inReview: 0, resolved: 0, overdue: 0 },
			trend: [],
		}
	}

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
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, 'complaints.view')) {
		return []
	}

	const allowedStoreIds = resolveAllowedStoreIds(
		membership.storeAccessMode,
		membership.storeIds,
	)

	return getFeaturedComplaintsForOrganization(
		membership.organizationId,
		allowedStoreIds,
	)
}
