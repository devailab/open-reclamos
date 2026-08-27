import {
	MAX_SUSPENSION_REASON_LENGTH,
	ORGANIZATION_STATUSES,
	type OrganizationStatus,
} from './constants'

export const ORGANIZATION_STATUS_FILTERS = [
	'all',
	...ORGANIZATION_STATUSES,
] as const
export type OrganizationStatusFilter =
	(typeof ORGANIZATION_STATUS_FILTERS)[number]

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120

export interface PlatformOrganizationsTableFilters {
	name: string
	status: OrganizationStatusFilter
}

export const DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS: PlatformOrganizationsTableFilters =
	{
		name: '',
		status: 'all',
	}

export const isOrganizationStatus = (
	value: string,
): value is OrganizationStatus => {
	return ORGANIZATION_STATUSES.includes(value as OrganizationStatus)
}

const isOrganizationStatusFilter = (
	value: string,
): value is OrganizationStatusFilter => {
	return ORGANIZATION_STATUS_FILTERS.includes(
		value as OrganizationStatusFilter,
	)
}

export const validateOrganizationId = (value: string): string | null => {
	if (!value || value.trim() === '') {
		return 'La organización es requerida.'
	}

	if (!/^[0-9a-fA-F-]{36}$/.test(value.trim())) {
		return 'El identificador de organización no es válido.'
	}

	return null
}

export const normalizeSuspensionReason = (
	value: string | null | undefined,
): string | null => {
	const trimmed = value?.trim() ?? ''
	return trimmed.length > 0
		? trimmed.slice(0, MAX_SUSPENSION_REASON_LENGTH)
		: null
}

export const validateSuspensionReason = (
	value: string | null,
): string | null => {
	if (!value) {
		return 'El motivo de la suspensión es requerido.'
	}

	if (value.length < 5) {
		return 'El motivo de la suspensión debe tener al menos 5 caracteres.'
	}

	return null
}

export const normalizePlatformOrganizationsTableFilters = (
	filters?: Partial<PlatformOrganizationsTableFilters>,
): PlatformOrganizationsTableFilters => {
	const normalizedName = (filters?.name ?? '')
		.trim()
		.slice(0, MAX_NAME_LENGTH)
	const requestedStatus = filters?.status

	const normalizedStatus = isOrganizationStatusFilter(requestedStatus ?? '')
		? (requestedStatus ??
			DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS.status)
		: DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS.status

	return {
		name: normalizedName,
		status: normalizedStatus,
	}
}

export const normalizePlatformPagination = (
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
