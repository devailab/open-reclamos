export type Role = 'admin' | 'operator' | 'viewer'
export type StoreAccessMode = 'all' | 'selected'

export interface Access {
	role: Role
	store_access_mode: StoreAccessMode
	store_ids: string[]
}

export interface StoreOption {
	id: string
	name: string
}

export interface UserDTO {
	id: string
	name: string
	last_name: string
	email: string
	active: boolean
	role: Role
	store_access_mode: StoreAccessMode
	created_at: string
}

export interface InvitationDTO {
	id: string
	email: string
	role: Role
	store_access_mode: StoreAccessMode
	expires_at: string
	accepted_at: string | null
	revoked_at: string | null
	created_at: string
}

export interface UserRow {
	userId: string
	name: string
	email: string
	role: Role
	roleName: string
	storeAccessMode: StoreAccessMode
	createdAt: string
}

export interface InvitationRow {
	id: string
	email: string
	roleName: string
	storeAccessMode: StoreAccessMode
	expiresAt: string
}

export interface UsersTableFilters {
	search: string
}

export const DEFAULT_USERS_TABLE_FILTERS: UsersTableFilters = { search: '' }

export const ROLE_OPTIONS = [
	{ value: 'admin', label: 'Administrador' },
	{ value: 'operator', label: 'Operador' },
	{ value: 'viewer', label: 'Solo lectura' },
]

export function roleLabel(role: Role) {
	return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
}
