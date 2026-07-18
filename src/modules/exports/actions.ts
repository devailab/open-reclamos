'use server'

import { getStoreOptionsForOrganization } from '@/modules/complaints/dashboard-queries'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import { getOrganizationForExport } from './queries'

export async function $getExportPageDataAction() {
	const access = await requireAccess(
		'exports.view',
		MESSAGES.exports.accessDenied,
	)
	if ('error' in access) return { error: access.error } as const

	const { membership } = access
	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined

	const [stores, organization] = await Promise.all([
		getStoreOptionsForOrganization(
			membership.organizationId,
			allowedStoreIds,
		),
		getOrganizationForExport(membership.organizationId),
	])

	return { stores, organization } as const
}
