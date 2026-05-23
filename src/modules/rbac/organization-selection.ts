export const ACTIVE_ORGANIZATION_COOKIE = 'active_organization_id'
export const ORGANIZATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function selectActiveOrganizationId(
	requestedOrganizationId: string | null | undefined,
	organizationIds: string[],
): string | null {
	if (organizationIds.length === 0) return null

	if (
		requestedOrganizationId &&
		organizationIds.includes(requestedOrganizationId)
	) {
		return requestedOrganizationId
	}

	return organizationIds[0] ?? null
}

export function buildOrganizationLogoUrl(organizationId: string): string {
	return `/api/organizations/${organizationId}/logo`
}
