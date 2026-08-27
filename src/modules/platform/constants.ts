export const ORGANIZATION_STATUS_ACTIVE = 'active'
export const ORGANIZATION_STATUS_SUSPENDED = 'suspended'

export const ORGANIZATION_STATUSES = [
	ORGANIZATION_STATUS_ACTIVE,
	ORGANIZATION_STATUS_SUSPENDED,
] as const

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

export const ORGANIZATION_STATUS_LABEL: Record<OrganizationStatus, string> = {
	active: 'Activa',
	suspended: 'Suspendida',
}

export const MAX_SUSPENSION_REASON_LENGTH = 500
