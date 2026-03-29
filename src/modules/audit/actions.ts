'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	type AuditLogTableRow,
	getAuditLogsTableForOrganization,
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

async function requireAccess(permissionKey: string) {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return {
			error: 'No tienes permisos para realizar esta acción.',
		} as const
	}

	return { session, membership } as const
}

export async function $getAuditLogsTableAction(
	input: GetAuditLogsTableActionInput,
): Promise<GetAuditLogsTableActionResult> {
	const access = await requireAccess('audit.view')

	const { page, pageSize } = normalizeAuditTablePagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeAuditTableFilters(input.filters)

	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page,
			pageSize,
			filters,
			error: access.error,
		}
	}

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
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}
