import type { Metadata, NextPage } from 'next'
import { notFound } from 'next/navigation'
import { ComplaintForm } from '@/modules/complaints/components/complaint-form'
import { ComplaintPageLayout } from '@/modules/complaints/components/complaint-page-layout'
import { FormUnavailableCard } from '@/modules/complaints/components/form-unavailable-card'
import {
	getComplaintReasonsForOrg,
	getOrganizationBySlug,
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
	const org = await getOrganizationBySlug(slug)
	if (!org) return { robots }
	return {
		title: `Libro de Reclamaciones — ${org.name}`,
		description: `Presenta tu reclamo o queja ante ${org.name}`,
		robots,
	}
}

const OrgComplaintPage: NextPage<PageProps> = async ({ params }) => {
	const { slug } = await params

	// Validate slug format to prevent unnecessary DB queries
	if (!/^[a-z0-9-]+$/.test(slug)) notFound()

	const [org, countries] = await Promise.all([
		getOrganizationBySlug(slug),
		getCountries(),
	])

	if (!org) notFound()

	const [stores, reasons] = await Promise.all([
		getStoresByOrganizationId(org.id),
		getComplaintReasonsForOrg(org.id),
	])
	const isOrganizationFormUnavailable = !org.formEnabled
	const shouldShowForm = !isOrganizationFormUnavailable && stores.length > 0

	return (
		<ComplaintPageLayout org={org}>
			{shouldShowForm ? (
				<ComplaintForm
					organizationId={org.id}
					organizationName={org.name}
					stores={stores}
					countries={countries}
					reasons={reasons}
					turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''}
				/>
			) : (
				<FormUnavailableCard
					description={
						isOrganizationFormUnavailable
							? 'No existe un formulario de reclamos disponible para esta organización en este momento.'
							: 'No existe un formulario de reclamos disponible para ninguna tienda activa de esta organización.'
					}
				/>
			)}
		</ComplaintPageLayout>
	)
}

export default OrgComplaintPage
