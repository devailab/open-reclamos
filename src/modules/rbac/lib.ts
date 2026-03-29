import rbacData from '@/database/base/rbac.json'

export type PermissionDefinition = (typeof rbacData.permissions)[number]
export type RoleDefinition = (typeof rbacData.roles)[number]

export const SYSTEM_PERMISSION_DEFINITIONS = rbacData.permissions
export const BASE_ROLE_DEFINITIONS = rbacData.roles

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
	prefix: 'role' | 'permission',
	organizationId: string,
	slug: string,
) => {
	return `${prefix}:${organizationId}:${slug}`
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase()
}

export function normalizePermissionKey(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9.\-_]/g, '-')
		.replace(/-+/g, '-')
}

export function isSelectedStoreAccessMode(value: string | null | undefined) {
	return value === STORE_ACCESS_SELECTED
}
