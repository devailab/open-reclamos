import { describe, expect, it } from 'bun:test'
import {
	BASE_ROLE_DEFINITIONS,
	canAssignRoleLevel,
	canGrantPermissionKeys,
	canGrantStoreAccess,
	canManageMember,
	getDefaultMemberPermissionKeysForRoleKey,
	getPermissionAssignment,
	getUngrantablePermissionKeys,
	isMemberAssignableSystemPermissionKey,
	isRoleAssignableSystemPermissionKey,
	type StoreAccessGrant,
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

	it('keeps role reordering exclusive to the base admin role', () => {
		const permission = SYSTEM_PERMISSION_DEFINITIONS.find(
			(definition) => definition.key === 'roles.reorder',
		)

		expect(permission).toBeDefined()
		if (!permission) throw new Error('roles.reorder permission not found')

		expect(getPermissionAssignment(permission)).toBe('system')
		expect(isRoleAssignableSystemPermissionKey(permission.key)).toBe(false)
		expect(isMemberAssignableSystemPermissionKey(permission.key)).toBe(
			false,
		)

		const adminRole = BASE_ROLE_DEFINITIONS.find(
			(role) => role.key === 'organization-admin',
		)
		const otherRoles = BASE_ROLE_DEFINITIONS.filter(
			(role) => role.key !== 'organization-admin',
		)
		expect(adminRole?.permissionKeys).toContain(permission.key)
		expect(
			otherRoles.some((role) =>
				role.permissionKeys.includes(permission.key),
			),
		).toBe(false)
	})

	it('defines fixed levels for the base roles', () => {
		expect(
			BASE_ROLE_DEFINITIONS.map((role) => ({
				key: role.key,
				level: role.level,
			})),
		).toEqual([
			{ key: 'organization-admin', level: 1 },
			{ key: 'organization-operator', level: 2 },
			{ key: 'organization-viewer', level: 3 },
		])
	})
})

describe('getUngrantablePermissionKeys', () => {
	it('allows requesting only permissions the actor already has', () => {
		expect(
			getUngrantablePermissionKeys({
				actorPermissionKeys: ['complaints.view', 'complaints.manage'],
				requestedPermissionKeys: ['complaints.view'],
			}),
		).toEqual([])
	})

	it('reports permissions beyond the actor access', () => {
		expect(
			getUngrantablePermissionKeys({
				actorPermissionKeys: ['complaints.view'],
				requestedPermissionKeys: [
					'complaints.view',
					'users.manage',
					'settings.manage',
				],
			}),
		).toEqual(['users.manage', 'settings.manage'])
	})

	it('allows keeping permissions that were already granted', () => {
		expect(
			getUngrantablePermissionKeys({
				actorPermissionKeys: ['complaints.view'],
				requestedPermissionKeys: ['complaints.view', 'users.manage'],
				alreadyGrantedPermissionKeys: ['users.manage'],
			}),
		).toEqual([])
	})

	it('blocks re-adding a permission once it is no longer granted', () => {
		expect(
			getUngrantablePermissionKeys({
				actorPermissionKeys: ['complaints.view'],
				requestedPermissionKeys: ['complaints.view', 'users.manage'],
				alreadyGrantedPermissionKeys: [],
			}),
		).toEqual(['users.manage'])
	})

	it('deduplicates the reported permission keys', () => {
		expect(
			getUngrantablePermissionKeys({
				actorPermissionKeys: [],
				requestedPermissionKeys: ['users.manage', 'users.manage'],
			}),
		).toEqual(['users.manage'])
	})

	it('handles an empty request', () => {
		expect(
			canGrantPermissionKeys({
				actorPermissionKeys: [],
				requestedPermissionKeys: [],
			}),
		).toBe(true)
	})

	it('canGrantPermissionKeys mirrors the ungrantable check', () => {
		expect(
			canGrantPermissionKeys({
				actorPermissionKeys: ['complaints.view'],
				requestedPermissionKeys: ['users.manage'],
			}),
		).toBe(false)
		expect(
			canGrantPermissionKeys({
				actorPermissionKeys: ['complaints.view'],
				requestedPermissionKeys: ['users.manage'],
				alreadyGrantedPermissionKeys: ['users.manage'],
			}),
		).toBe(true)
	})
})

describe('canGrantStoreAccess', () => {
	it('allows everything when the actor has access to all stores', () => {
		expect(
			canGrantStoreAccess({
				actorAccess: { storeAccessMode: 'all', storeIds: [] },
				requestedAccess: { storeAccessMode: 'all', storeIds: [] },
			}),
		).toBe(true)
		expect(
			canGrantStoreAccess({
				actorAccess: { storeAccessMode: 'all', storeIds: [] },
				requestedAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-a'],
				},
			}),
		).toBe(true)
	})

	it('blocks granting access to all stores when the actor is limited', () => {
		expect(
			canGrantStoreAccess({
				actorAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-a'],
				},
				requestedAccess: { storeAccessMode: 'all', storeIds: [] },
			}),
		).toBe(false)
	})

	it('limits a restricted actor to their own stores', () => {
		const actorAccess: StoreAccessGrant = {
			storeAccessMode: 'selected',
			storeIds: ['store-a', 'store-b'],
		}

		expect(
			canGrantStoreAccess({
				actorAccess,
				requestedAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-a'],
				},
			}),
		).toBe(true)
		expect(
			canGrantStoreAccess({
				actorAccess,
				requestedAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-a', 'store-c'],
				},
			}),
		).toBe(false)
	})

	it('allows keeping store access the target already has', () => {
		expect(
			canGrantStoreAccess({
				actorAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-a'],
				},
				requestedAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-a', 'store-c'],
				},
				alreadyGrantedAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-c'],
				},
			}),
		).toBe(true)
	})

	it('allows keeping or narrowing an existing all-stores access', () => {
		const actorAccess: StoreAccessGrant = {
			storeAccessMode: 'selected',
			storeIds: ['store-a'],
		}
		const alreadyGrantedAccess: StoreAccessGrant = {
			storeAccessMode: 'all',
			storeIds: [],
		}

		expect(
			canGrantStoreAccess({
				actorAccess,
				requestedAccess: { storeAccessMode: 'all', storeIds: [] },
				alreadyGrantedAccess,
			}),
		).toBe(true)
		expect(
			canGrantStoreAccess({
				actorAccess,
				requestedAccess: {
					storeAccessMode: 'selected',
					storeIds: ['store-c'],
				},
				alreadyGrantedAccess,
			}),
		).toBe(true)
	})
})

describe('canAssignRoleLevel', () => {
	it('allows assigning roles with a lower rank than the actor', () => {
		expect(canAssignRoleLevel({ actorRoleLevel: 1, roleLevel: 2 })).toBe(
			true,
		)
	})

	it('rejects assigning roles with the same level as the actor', () => {
		expect(canAssignRoleLevel({ actorRoleLevel: 2, roleLevel: 2 })).toBe(
			false,
		)
	})

	it('rejects assigning roles with a higher rank than the actor', () => {
		expect(canAssignRoleLevel({ actorRoleLevel: 2, roleLevel: 1 })).toBe(
			false,
		)
	})

	it('allows a super admin to assign any role level', () => {
		expect(
			canAssignRoleLevel({
				actorRoleLevel: 3,
				roleLevel: 1,
				actorIsSuperAdmin: true,
			}),
		).toBe(true)
	})
})

describe('canManageMember', () => {
	it('never allows managing a super admin, even for another super admin', () => {
		expect(
			canManageMember({
				actorRoleLevel: 1,
				targetRoleLevel: 1,
				targetIsSuperAdmin: true,
				actorIsSuperAdmin: true,
			}),
		).toBe(false)
	})

	it('allows managing members with the same or a lower rank', () => {
		expect(
			canManageMember({
				actorRoleLevel: 1,
				targetRoleLevel: 1,
				targetIsSuperAdmin: false,
			}),
		).toBe(true)
		expect(
			canManageMember({
				actorRoleLevel: 1,
				targetRoleLevel: 3,
				targetIsSuperAdmin: false,
			}),
		).toBe(true)
	})

	it('rejects managing members with a higher rank than the actor', () => {
		expect(
			canManageMember({
				actorRoleLevel: 2,
				targetRoleLevel: 1,
				targetIsSuperAdmin: false,
			}),
		).toBe(false)
	})

	it('allows a super admin to manage any non super admin member', () => {
		expect(
			canManageMember({
				actorRoleLevel: 3,
				targetRoleLevel: 1,
				targetIsSuperAdmin: false,
				actorIsSuperAdmin: true,
			}),
		).toBe(true)
	})
})
