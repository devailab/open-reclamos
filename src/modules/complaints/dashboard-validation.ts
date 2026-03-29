const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_SEARCH_LENGTH = 120
const DEFAULT_DASHBOARD_TREND_DAYS = 7

export const DASHBOARD_TREND_DAY_OPTIONS = [7, 15, 30] as const
export type DashboardTrendDays = (typeof DASHBOARD_TREND_DAY_OPTIONS)[number]

export interface DashboardTrendPoint {
	date: string
	count: number
}

export const COMPLAINT_STATUSES = [
	'open',
	'in_progress',
	'in_review',
	'resolved',
	'closed',
] as const
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number]

export const CHANGEABLE_STATUSES = [
	'in_progress',
	'in_review',
	'closed',
] as const
export type ChangeableStatus = (typeof CHANGEABLE_STATUSES)[number]

export const COMPLAINT_TYPES = ['complaint', 'claim'] as const
export type ComplaintType = (typeof COMPLAINT_TYPES)[number]

export const COMPLAINT_STATUS_FILTERS = ['all', ...COMPLAINT_STATUSES] as const
export type ComplaintStatusFilter = (typeof COMPLAINT_STATUS_FILTERS)[number]

export const COMPLAINT_TYPE_FILTERS = ['all', ...COMPLAINT_TYPES] as const
export type ComplaintTypeFilter = (typeof COMPLAINT_TYPE_FILTERS)[number]

export interface ComplaintsTableFilters {
	search: string
	type: ComplaintTypeFilter
	status: ComplaintStatusFilter
	storeId: string
}

export const DEFAULT_COMPLAINTS_TABLE_FILTERS: ComplaintsTableFilters = {
	search: '',
	type: 'all',
	status: 'all',
	storeId: 'all',
}

const isComplaintStatusFilter = (
	value: string,
): value is ComplaintStatusFilter =>
	COMPLAINT_STATUS_FILTERS.includes(value as ComplaintStatusFilter)

const isComplaintTypeFilter = (value: string): value is ComplaintTypeFilter =>
	COMPLAINT_TYPE_FILTERS.includes(value as ComplaintTypeFilter)

export const normalizeComplaintsTableFilters = (
	filters?: Partial<ComplaintsTableFilters>,
): ComplaintsTableFilters => {
	const search = (filters?.search ?? '').trim().slice(0, MAX_SEARCH_LENGTH)

	const requestedType = filters?.type
	const type = isComplaintTypeFilter(requestedType ?? '')
		? (requestedType ?? DEFAULT_COMPLAINTS_TABLE_FILTERS.type)
		: DEFAULT_COMPLAINTS_TABLE_FILTERS.type

	const requestedStatus = filters?.status
	const status = isComplaintStatusFilter(requestedStatus ?? '')
		? (requestedStatus ?? DEFAULT_COMPLAINTS_TABLE_FILTERS.status)
		: DEFAULT_COMPLAINTS_TABLE_FILTERS.status

	const storeId = filters?.storeId ?? 'all'

	return { search, type, status, storeId }
}

export const normalizeComplaintsPagination = (
	page: number,
	pageSize: number,
): { page: number; pageSize: number } => {
	const normalizedPage =
		Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE

	const normalizedPageSize =
		Number.isFinite(pageSize) && pageSize > 0
			? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE)
			: DEFAULT_PAGE_SIZE

	return { page: normalizedPage, pageSize: normalizedPageSize }
}

export const normalizeDashboardTrendDays = (
	value?: number,
): DashboardTrendDays => {
	if (
		value &&
		DASHBOARD_TREND_DAY_OPTIONS.includes(value as DashboardTrendDays)
	) {
		return value as DashboardTrendDays
	}

	return DEFAULT_DASHBOARD_TREND_DAYS
}
