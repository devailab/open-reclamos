import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router'
import { getPublicBook } from '../api'
import { ComplaintForm } from '../features/public-book/complaint-form'
import { ComplaintPageLayout } from '../features/public-book/complaint-page-layout'
import { FormUnavailableCard } from '../features/public-book/form-unavailable-card'
import { QueryState, useFeatureQuery } from '../hooks/use-feature-query'

export function PublicBookPage() {
	const { slug = '' } = useParams<{ slug: string }>()
	const { pathname } = useLocation()
	const kind = pathname.startsWith('/s/') ? 'store' : 'organization'

	const load = useCallback(
		(signal: AbortSignal) => getPublicBook(slug, kind, signal),
		[slug, kind],
	)

	const query = useFeatureQuery(load)

	if (!query.data) {
		return <QueryState error={query.error} reload={query.reload} />
	}

	const {
		organization,
		stores,
		countries,
		reasons,
		turnstileEnabled,
		turnstileSiteKey,
	} = query.data

	const selectedStore =
		kind === 'store'
			? stores.find((store) => store.slug === slug)
			: undefined

	const enabledStores = stores.filter((store) => store.formEnabled)

	const available =
		organization.formEnabled &&
		(kind === 'store'
			? selectedStore?.formEnabled
			: enabledStores.length > 0)

	return (
		<ComplaintPageLayout org={organization} storeName={selectedStore?.name}>
			{available ? (
				<ComplaintForm
					key={pathname}
					organizationSlug={organization.slug}
					organizationName={organization.name}
					stores={kind === 'organization' ? enabledStores : undefined}
					preselectedStore={selectedStore}
					totalStores={stores.length}
					countries={countries}
					reasons={reasons}
					turnstileEnabled={turnstileEnabled}
					turnstileSiteKey={turnstileSiteKey}
				/>
			) : (
				<FormUnavailableCard description='No existe un formulario de reclamos disponible en este momento.' />
			)}
		</ComplaintPageLayout>
	)
}
