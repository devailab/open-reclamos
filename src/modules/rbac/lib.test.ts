import { describe, expect, it } from 'bun:test'
import {
	getDefaultMemberPermissionKeysForRoleKey,
	getPermissionAssignment,
	isRoleAssignableSystemPermissionKey,
	SYSTEM_PERMISSION_DEFINITIONS,
} from './lib'

describe('rbac lib', () => {
	it('marks complaints.notify as a member-only permission', () => {
		const permission = SYSTEM_PERMISSION_DEFINITIONS.find(
			(definition) => definition.key === 'complaints.notify',
		)

		expect(permission).toBeDefined()
		if (!permission) {
			throw new Error('complaints.notify permission not found')
		}
		expect(getPermissionAssignment(permission)).toBe('member')
		expect(isRoleAssignableSystemPermissionKey('complaints.notify')).toBe(
			false,
		)
	})

	it('enables complaint notifications by default for admin and operator', () => {
		expect(
			getDefaultMemberPermissionKeysForRoleKey('organization-admin'),
		).toContain('complaints.notify')
		expect(
			getDefaultMemberPermissionKeysForRoleKey('organization-operator'),
		).toContain('complaints.notify')
		expect(
			getDefaultMemberPermissionKeysForRoleKey('organization-viewer'),
		).toEqual([])
	})
})
