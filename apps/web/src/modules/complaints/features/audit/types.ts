import type { AuditTableFilters } from './validation'

export interface AuditLogRow {
	id: string
	organizationId: string | null
	userId: string | null
	userName: string
	userEmail: string
	action: string
	entityType: string
	entityId: string | null
	oldData: unknown
	newData: unknown
	description: string | null
	ipAddress: string | null
	userAgent: string | null
	createdAt: Date
}

export interface AuditRecord {
	id: string
	organization_id: string | null
	user_id: string | null
	action: string
	entity_type: string
	entity_id: string | null
	old_data: unknown
	new_data: unknown
	description: string | null
	ip_address: string | null
	user_agent: string | null
	created_at: string
}

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
