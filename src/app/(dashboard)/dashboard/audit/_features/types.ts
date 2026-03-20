import type { AuditLogTableRow } from '@/modules/audit/queries'
import type { AuditTableFilters } from '@/modules/audit/validation'

export type AuditLogRow = AuditLogTableRow

export interface AuditInitialState {
	rows: AuditLogRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: AuditTableFilters
}

export interface AuditPageProps {
	initialState: AuditInitialState
}
