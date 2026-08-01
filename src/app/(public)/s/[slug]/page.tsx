import type { Metadata, NextPage } from 'next'
import { notFound } from 'next/navigation'
import { ComplaintForm } from '@/modules/complaints/components/complaint-form'
import { ComplaintPageLayout } from '@/modules/complaints/components/complaint-page-layout'
import { FormUnavailableCard } from '@/modules/complaints/components/form-unavailable-card'
import {
	getComplaintReasonsForOrg,
	getOrganizationById,
	getStoreBySlug,
	getStoresByOrganizationId,
} from '@/modules/complaints/queries'
import { getCountries } from '@/modules/setup/queries'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params
	const robots: Metadata['robots'] = { index: false, follow: false }
	const store = await getStoreBySlug(slug)
	if (!store) return { robots }
	return {
		title: `Libro de Reclamaciones — ${store.name}`,
		description: `Presenta tu reclamo o queja ante ${store.name}`,
		robots,
	}
}

const StoreComplaintPage: NextPage<PageProps> = async ({ params }) => {
	const { slug } = await params

	if (!/^[a-z0-9-]+$/.test(slug)) notFound()

	const [store, countries] = await Promise.all([
		getStoreBySlug(slug),
		getCountries(),
	])

	if (!store) notFound()

	const [org, reasons, orgStores] = await Promise.all([
		getOrganizationById(store.organizationId),
		getComplaintReasonsForOrg(store.organizationId),
		getStoresByOrganizationId(store.organizationId),
	])

	if (!org) notFound()

	const isFormUnavailable =
		Boolean(store.deletedAt) || !store.formEnabled || !org.formEnabled
	const unavailableDescription = store.deletedAt
		? 'No existe un formulario de reclamos disponible para esta tienda.'
		: !org.formEnabled
			? 'No existe un formulario de reclamos disponible para esta organización en este momento.'
			: 'No existe un formulario de reclamos disponible para esta tienda.'

	return (
		<ComplaintPageLayout org={org} storeName={store.name}>
			{isFormUnavailable ? (
				<FormUnavailableCard description={unavailableDescription} />
			) : (
				<ComplaintForm
					organizationId={org.id}
					organizationName={org.name}
					preselectedStore={store}
					totalStores={orgStores.length}
					countries={countries}
					reasons={reasons}
					turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''}
				/>
			)}
		</ComplaintPageLayout>
	)
}

export default StoreComplaintPage
