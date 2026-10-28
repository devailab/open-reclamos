import type { InstallationStatus, OrganizationDTO, SessionDTO } from './types'

export function hasTenantAccess(session: SessionDTO): boolean {
	return Boolean(
		session.organization_id &&
			['admin', 'operator', 'viewer'].includes(session.role ?? ''),
	)
}

export function shouldRedirectLogin(
	session: SessionDTO | null,
	organizationSlug: string | undefined,
	forceLocal: boolean,
	tenantError: Error | null,
): boolean {
	return Boolean(
		session &&
			hasTenantAccess(session) &&
			!organizationSlug &&
			!forceLocal &&
			!tenantError,
	)
}

export function sessionDestination(
	session: SessionDTO,
	status: InstallationStatus,
	organizations: OrganizationDTO[],
): string {
	if (hasTenantAccess(session)) {
		return '/dashboard'
	}

	if (
		session.organization_id ||
		organizations.some((organization) => organization.status === 'active')
	) {
		return '/dashboard/account'
	}

	return canCreateOrganization(
		session,
		status.public_registration,
		organizations,
	)
		? '/setup'
		: '/dashboard/account'
}

export function canCreateOrganization(
	session: SessionDTO,
	publicRegistration: boolean,
	organizations: OrganizationDTO[],
): boolean {
	return (
		session.auth_method === 'local' &&
		(publicRegistration ||
			session.user.is_platform_admin ||
			organizations.some(
				(organization) =>
					organization.role === 'admin' &&
					organization.status === 'active',
			))
	)
}
