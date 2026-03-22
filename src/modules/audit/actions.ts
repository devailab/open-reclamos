'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import {
	type AuditLogTableRow,
	getAuditLogsTableForOrganization,
	getOrganizationForUser,
} from './queries'
import {
	type AuditTableFilters,
	type AuditTableFiltersInput,
	normalizeAuditTableFilters,
	normalizeAuditTablePagination,
	validateAuditTableFilters,
} from './validation'

export interface GetAuditLogsTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<AuditTableFiltersInput>
}

export interface GetAuditLogsTableActionResult {
	rows: AuditLogTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: AuditTableFilters
	error?: string
}

export async function $getAuditLogsTableAction(
	input: GetAuditLogsTableActionInput,
): Promise<GetAuditLogsTableActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const { page, pageSize } = normalizeAuditTablePagination(
		input.page,
		input.pageSize,
	)

	const filters = normalizeAuditTableFilters(input.filters)
	const validationError = validateAuditTableFilters(filters)
	if (validationError) {
		return {
			rows: [],
			totalItems: 0,
			page,
			pageSize,
			filters,
			error: validationError,
		}
	}

	const { rows, totalItems } = await getAuditLogsTableForOrganization({
		organizationId,
		page,
		pageSize,
		filters,
	})

	return {
		rows,
		totalItems,
		page,
		pageSize,
		filters,
	}
}
