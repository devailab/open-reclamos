export const ORGANIZATION_STATUS_SUSPENDED = 'suspended'

export const ORGANIZATION_STATUS_LABEL: Record<string, string> = {
	active: 'Activa',
	suspended: 'Suspendida',
}

export interface PlatformOrganizationsTableFilters {
	name: string
	status: 'all' | 'active' | 'suspended'
}

export const DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS: PlatformOrganizationsTableFilters =
	{ name: '', status: 'all' }

export interface OrganizationRecord {
	id: string
	name: string
	legal_name: string
	tax_id: string
	slug: string
	status: 'active' | 'suspended'
	suspension_reason: string | null
	stores_count: number
	created_at: string
}

export interface OrganizationRow {
	id: string
	name: string
	legalName: string
	taxId: string
	slug: string
	status: 'active' | 'suspended'
	suspensionReason: string | null
	storeCount: number
	createdAt: Date
}

export interface PlatformOverviewRecord {
	organizations: number
	suspended: number
	stores: number
	complaints: number
	users: number
}

export interface PlatformOverviewMetrics {
	totalOrganizations: number
	suspendedOrganizations: number
	totalStores: number
	totalComplaints: number
	totalUsers: number
}

export interface PlatformInitialState {
	metrics: PlatformOverviewMetrics
	rows: OrganizationRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: PlatformOrganizationsTableFilters
}

export interface PlatformPageProps {
	initialState: PlatformInitialState
}

export function normalizeSuspensionReason(value: string | null | undefined) {
	return value?.trim() || null
}

export function validateSuspensionReason(value: string | null): string | null {
	if (!value) {
		return 'El motivo de la suspensión es requerido.'
	}
	return null
}
