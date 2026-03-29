import type { PermissionOption } from '@/modules/rbac/queries'
import type { RoleTableRow } from '@/modules/roles/queries'
import type { RolesTableFilters } from '@/modules/roles/validation'

export type RoleRow = RoleTableRow
export type PermissionOptionRow = PermissionOption

export interface RolesInitialState {
	rows: RoleRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: RolesTableFilters
	permissions: PermissionOptionRow[]
}

export interface RolesPageProps {
	initialState: RolesInitialState
}
