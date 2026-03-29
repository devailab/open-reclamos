import type { PermissionTableRow } from '@/modules/permissions/queries'
import type { PermissionsTableFilters } from '@/modules/permissions/validation'

export type PermissionRow = PermissionTableRow

export interface PermissionsInitialState {
	rows: PermissionRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: PermissionsTableFilters
	moduleOptions: string[]
}

export interface PermissionsPageProps {
	initialState: PermissionsInitialState
}
