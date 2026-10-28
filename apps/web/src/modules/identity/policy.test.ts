import { describe, expect, it } from 'bun:test'
import { canCreateOrganization } from './policy'

const session = {
	user: {
		id: 'user',
		name: 'Ana',
		last_name: 'Pérez',
		email: 'ana@example.com',
		is_platform_admin: false,
	},
	organization_id: '',
	auth_method: 'local',
}

const organization = {
	id: 'org',
	name: 'Empresa',
	slug: 'empresa',
	role: 'admin',
	status: 'active',
}

describe('canCreateOrganization', () => {
	it('permite registro abierto solo con sesión local', () => {
		expect(canCreateOrganization(session, true, [])).toBe(true)

		for (const auth_method of ['oidc', 'saml', 'api']) {
			expect(
				canCreateOrganization({ ...session, auth_method }, true, [
					organization,
				]),
			).toBe(false)
		}
	})

	it('rechaza usuarios sin empresas y roles no administrativos con registro cerrado', () => {
		expect(canCreateOrganization(session, false, [])).toBe(false)

		for (const role of ['operator', 'viewer']) {
			expect(
				canCreateOrganization(session, false, [
					{ ...organization, role },
				]),
			).toBe(false)
		}
	})

	it('permite administradores de una empresa activa, no suspendida', () => {
		expect(canCreateOrganization(session, false, [organization])).toBe(true)

		expect(
			canCreateOrganization(session, false, [
				{ ...organization, status: 'suspended' },
			]),
		).toBe(false)
	})

	it('permite bootstrap de plataforma con sesión local', () => {
		const platform = {
			...session,
			user: { ...session.user, is_platform_admin: true },
		}

		expect(canCreateOrganization(platform, false, [])).toBe(true)

		expect(
			canCreateOrganization(
				{ ...platform, auth_method: 'oidc' },
				false,
				[],
			),
		).toBe(false)
	})
})
