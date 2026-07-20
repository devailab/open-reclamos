import rbacData from '@/database/base/rbac.json'

export type PermissionDefinition = (typeof rbacData.permissions)[number]
export type RoleDefinition = (typeof rbacData.roles)[number]
export type PermissionAssignment = 'role' | 'member' | 'system'

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

export interface PermissionGrantCheck {
	actorPermissionKeys: string[]
	requestedPermissionKeys: string[]
	alreadyGrantedPermissionKeys?: string[]
}

export function getUngrantablePermissionKeys({
	actorPermissionKeys,
	requestedPermissionKeys,
	alreadyGrantedPermissionKeys = [],
}: PermissionGrantCheck): string[] {
	const grantableKeys = new Set([
		...actorPermissionKeys,
		...alreadyGrantedPermissionKeys,
	])

	return Array.from(new Set(requestedPermissionKeys)).filter(
		(key) => !grantableKeys.has(key),
	)
}

export function canGrantPermissionKeys(check: PermissionGrantCheck): boolean {
	return getUngrantablePermissionKeys(check).length === 0
}

export interface RoleLevelAssignmentCheck {
	actorRoleLevel: number
	roleLevel: number
	actorIsSuperAdmin?: boolean
}

export function canAssignRoleLevel({
	actorRoleLevel,
	roleLevel,
	actorIsSuperAdmin = false,
}: RoleLevelAssignmentCheck): boolean {
	if (actorIsSuperAdmin) return true

	return roleLevel > actorRoleLevel
}

export interface MemberManagementCheck {
	actorRoleLevel: number
	targetRoleLevel: number
	targetIsSuperAdmin: boolean
	actorIsSuperAdmin?: boolean
}

export function canManageMember({
	actorRoleLevel,
	targetRoleLevel,
	targetIsSuperAdmin,
	actorIsSuperAdmin = false,
}: MemberManagementCheck): boolean {
	if (targetIsSuperAdmin) return false
	if (actorIsSuperAdmin) return true

	return targetRoleLevel >= actorRoleLevel
}

export interface StoreAccessGrant {
	storeAccessMode: 'all' | 'selected'
	storeIds: string[]
}

export interface StoreAccessGrantCheck {
	actorAccess: StoreAccessGrant
	requestedAccess: StoreAccessGrant
	alreadyGrantedAccess?: StoreAccessGrant
}

export function canGrantStoreAccess({
	actorAccess,
	requestedAccess,
	alreadyGrantedAccess,
}: StoreAccessGrantCheck): boolean {
	if (actorAccess.storeAccessMode === 'all') return true
	if (alreadyGrantedAccess?.storeAccessMode === 'all') return true
	if (requestedAccess.storeAccessMode === 'all') return false

	const grantableStoreIds = new Set([
		...actorAccess.storeIds,
		...(alreadyGrantedAccess?.storeIds ?? []),
	])

	return requestedAccess.storeIds.every((storeId) =>
		grantableStoreIds.has(storeId),
	)
}

export function isSelectedStoreAccessMode(value: string | null | undefined) {
	return value === STORE_ACCESS_SELECTED
}

export function getPermissionAssignment(
	definition: PermissionDefinition,
): PermissionAssignment {
	if (definition.assignment === 'member') return 'member'
	if (definition.assignment === 'system') return 'system'
	return 'role'
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
