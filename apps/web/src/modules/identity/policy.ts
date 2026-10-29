import type { InstallationStatus, OrganizationDTO, SessionDTO } from './types'

export function hasTenantAccess(session: SessionDTO): boolean {
	return Boolean(
		session.organization_id &&
			['admin', 'operator', 'viewer'].includes(session.role ?? ''),
	)
}

type LoginSession = SessionDTO & {
	organization?: Pick<OrganizationDTO, 'id' | 'slug'>
}

export function shouldRedirectLogin(
	session: LoginSession | null,
	organizationSlug: string | undefined,
	forceLocal: boolean,
	tenantError: Error | null,
): boolean {
	if (!session || !hasTenantAccess(session) || forceLocal || tenantError) {
		return false
	}

	if (!organizationSlug) {
		return true
	}

	const organization = session.organization
	return Boolean(
		organization &&
			organization.id === session.organization_id &&
			organization.slug === organizationSlug,
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
