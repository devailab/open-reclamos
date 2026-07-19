import rbacData from '@/database/base/rbac.json'

export type PermissionDefinition = (typeof rbacData.permissions)[number]
export type RoleDefinition = (typeof rbacData.roles)[number]
export type PermissionAssignment = 'role' | 'member'

export const SYSTEM_PERMISSION_DEFINITIONS = rbacData.permissions
export const BASE_ROLE_DEFINITIONS = rbacData.roles
export const SUPER_ADMIN_ROLE_DEFINITION = rbacData.superAdminRole
export const ROLE_ASSIGNABLE_SYSTEM_PERMISSION_DEFINITIONS =
	SYSTEM_PERMISSION_DEFINITIONS.filter(
		(definition) => getPermissionAssignment(definition) === 'role',
	)
export const MEMBER_ASSIGNABLE_SYSTEM_PERMISSION_DEFINITIONS =
	SYSTEM_PERMISSION_DEFINITIONS.filter(
		(definition) => getPermissionAssignment(definition) === 'member',
	)
export const ROLE_ASSIGNABLE_SYSTEM_PERMISSION_KEYS =
	ROLE_ASSIGNABLE_SYSTEM_PERMISSION_DEFINITIONS.map(
		(definition) => definition.key,
	)
export const MEMBER_ASSIGNABLE_SYSTEM_PERMISSION_KEYS =
	MEMBER_ASSIGNABLE_SYSTEM_PERMISSION_DEFINITIONS.map(
		(definition) => definition.key,
	)

export const STORE_ACCESS_ALL = 'all'
export const STORE_ACCESS_SELECTED = 'selected'

export const slugifyRbacName = (value: string): string => {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 60)
}

export const buildOrganizationScopedKey = (
	prefix: 'role',
	organizationId: string,
	slug: string,
) => {
	return `${prefix}:${organizationId}:${slug}`
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase()
}

export function isSelectedStoreAccessMode(value: string | null | undefined) {
	return value === STORE_ACCESS_SELECTED
}

export function getPermissionAssignment(
	definition: PermissionDefinition,
): PermissionAssignment {
	return definition.assignment === 'member' ? 'member' : 'role'
}

export function isRoleAssignableSystemPermissionKey(key: string) {
	return ROLE_ASSIGNABLE_SYSTEM_PERMISSION_KEYS.includes(key)
}

export function isMemberAssignableSystemPermissionKey(key: string) {
	return MEMBER_ASSIGNABLE_SYSTEM_PERMISSION_KEYS.includes(key)
}

export function getDefaultMemberPermissionKeysForRoleKey(roleKey: string) {
	const role = BASE_ROLE_DEFINITIONS.find(
		(definition) => definition.key === roleKey,
	)
	if (!role?.defaultMemberPermissionKeys) return []

	return Array.from(new Set(role.defaultMemberPermissionKeys))
}
