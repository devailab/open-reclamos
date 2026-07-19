'use server'

import { requireAccess } from '@/modules/shared/access'
import {
	getPermissionsTableForOrganization,
	type PermissionTableRow,
} from './queries'
import {
	normalizePermissionsPagination,
	normalizePermissionsTableFilters,
	type PermissionsTableFilters,
} from './validation'

export interface GetPermissionsTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<PermissionsTableFilters>
}

export interface GetPermissionsTableActionResult {
	rows: PermissionTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: PermissionsTableFilters
}

export async function $getPermissionsTableAction(
	input: GetPermissionsTableActionInput,
): Promise<GetPermissionsTableActionResult> {
	const access = await requireAccess('permissions.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizePermissionsTableFilters(),
		}
	}

	const { page, pageSize } = normalizePermissionsPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizePermissionsTableFilters(input.filters)
	const { rows, totalItems } = await getPermissionsTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}
