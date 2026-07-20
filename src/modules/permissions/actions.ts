'use server'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext } from '@/modules/rbac/queries'
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
	const session = await getSession()
	if (!session) redirect('/login')

	const [user] = await db
		.select({ isSuperAdmin: users.isSuperAdmin })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)
	if (!user?.isSuperAdmin) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizePermissionsTableFilters(),
		}
	}
	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	const { page, pageSize } = normalizePermissionsPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizePermissionsTableFilters(input.filters)
	const { rows, totalItems } = await getPermissionsTableForOrganization({
		organizationId: membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}
