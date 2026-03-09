import type { Metadata, NextPage } from 'next'
import { notFound } from 'next/navigation'
import { ComplaintForm } from '@/modules/complaints/components/complaint-form'
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
	const org = await getOrganizationBySlug(slug)
	if (!org) return {}
	return {
		title: `Libro de Reclamaciones — ${org.name}`,
		description: `Presenta tu reclamo o queja ante ${org.name}`,
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

	return (
		<main className='min-h-screen bg-muted/30'>
			<div className='mx-auto max-w-2xl px-4 py-8'>
				{/* Header */}
				<div className='mb-8 text-center'>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Libro de Reclamaciones
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						{org.name}
					</p>
				</div>

				<ComplaintForm
					organizationId={org.id}
					organizationName={org.name}
					stores={stores}
					countries={countries}
					reasons={reasons}
				/>

				<p className='mt-6 text-center text-xs text-muted-foreground'>
					De acuerdo al Código de Protección y Defensa del Consumidor,
					toda empresa debe contar con un Libro de Reclamaciones. El
					proveedor debe dar respuesta en un plazo máximo de 15 días
					calendario.
				</p>
			</div>
		</main>
	)
}

export default OrgComplaintPage
