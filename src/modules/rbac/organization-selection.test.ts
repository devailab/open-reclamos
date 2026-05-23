import { describe, expect, it } from 'bun:test'
import {
	buildOrganizationLogoUrl,
	selectActiveOrganizationId,
} from './organization-selection'

describe('selectActiveOrganizationId', () => {
	it('uses the requested organization when it belongs to the user', () => {
		expect(selectActiveOrganizationId('org-2', ['org-1', 'org-2'])).toBe(
			'org-2',
		)
	})

	it('falls back to the first organization when the cookie is missing', () => {
		expect(selectActiveOrganizationId(null, ['org-1', 'org-2'])).toBe(
			'org-1',
		)
	})

	it('falls back to the first organization when the cookie is invalid', () => {
		expect(selectActiveOrganizationId('org-9', ['org-1', 'org-2'])).toBe(
			'org-1',
		)
	})

	it('returns null when the user has no organizations', () => {
		expect(selectActiveOrganizationId('org-1', [])).toBeNull()
	})
})

describe('buildOrganizationLogoUrl', () => {
	it('builds the internal logo route for an organization', () => {
		expect(buildOrganizationLogoUrl('org-123')).toBe(
			'/api/organizations/org-123/logo',
		)
	})
})
