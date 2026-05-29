'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { getStoreOptionsForOrganization } from '@/modules/complaints/dashboard-queries'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { getOrganizationForExport } from './queries'

export async function $getExportPageDataAction() {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, 'exports.view')) {
		return { error: 'No tienes permisos para acceder a las exportaciones.' } as const
	}

	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined

	const [stores, organization] = await Promise.all([
		getStoreOptionsForOrganization(membership.organizationId, allowedStoreIds),
		getOrganizationForExport(membership.organizationId),
	])

	return { stores, organization } as const
}
