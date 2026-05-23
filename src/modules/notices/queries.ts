import { getStoresByOrganizationId } from '@/modules/complaints/queries'
import { getMembershipContext } from '@/modules/rbac/queries'
import { getOrganizationSettingsForUser } from '@/modules/settings/queries'

export interface NoticeStoreOption {
	id: string
	name: string
	url: string
}

export interface NoticeLinkContext {
	defaultQrUrl: string
	stores: NoticeStoreOption[]
}

function normalizeFrontendUrl(frontendUrl: string) {
	return frontendUrl.trim().replace(/\/$/, '')
}

function buildOrganizationUrl(frontendUrl: string, organizationSlug: string) {
	return `${normalizeFrontendUrl(frontendUrl)}/c/${organizationSlug}`
}

function buildStoreUrl(frontendUrl: string, storeSlug: string) {
	return `${normalizeFrontendUrl(frontendUrl)}/s/${storeSlug}`
}

export async function getNoticeLinkContextForUser(params: {
	userId: string
	frontendUrl: string
}): Promise<NoticeLinkContext | null> {
	const [membership, organization] = await Promise.all([
		getMembershipContext(params.userId),
		getOrganizationSettingsForUser(params.userId),
	])

	if (!membership || !organization) {
		return null
	}

	const stores = await getStoresByOrganizationId(membership.organizationId)
	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? new Set(membership.storeIds)
			: null

	const visibleStores = allowedStoreIds
		? stores.filter((store) => allowedStoreIds.has(store.id))
		: stores

	return {
		defaultQrUrl: buildOrganizationUrl(
			params.frontendUrl,
			organization.slug,
		),
		stores: visibleStores.map((store) => ({
			id: store.id,
			name: store.name,
			url: buildStoreUrl(params.frontendUrl, store.slug),
		})),
	}
}
