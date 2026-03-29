import type { Metadata, NextPage } from 'next'
import { notFound } from 'next/navigation'
import { ComplaintForm } from '@/modules/complaints/components/complaint-form'
import { FormUnavailableCard } from '@/modules/complaints/components/form-unavailable-card'
import { TrackingPanel } from '@/modules/complaints/components/tracking-panel'
import {
	getComplaintReasonsForOrg,
	getOrganizationById,
	getStoreBySlug,
} from '@/modules/complaints/queries'
import { getCountries } from '@/modules/setup/queries'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params
	const store = await getStoreBySlug(slug)
	if (!store) return {}
	return {
		title: `Libro de Reclamaciones — ${store.name}`,
		description: `Presenta tu reclamo o queja ante ${store.name}`,
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

	const [org, reasons] = await Promise.all([
		getOrganizationById(store.organizationId),
		getComplaintReasonsForOrg(store.organizationId),
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
		<main className='min-h-screen bg-muted/30'>
			<div className='mx-auto max-w-2xl px-4 py-8'>
				{/* Header */}
				<div className='mb-8 text-center'>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Libro de Reclamaciones
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						{org.name} — {store.name}
					</p>
				</div>

				{isFormUnavailable ? (
					<FormUnavailableCard description={unavailableDescription} />
				) : (
					<ComplaintForm
						organizationId={org.id}
						organizationName={org.name}
						preselectedStore={store}
						countries={countries}
						reasons={reasons}
					/>
				)}

				<TrackingPanel organizationId={org.id} />

				<p className='mt-6 text-center text-xs text-muted-foreground'>
					De acuerdo al Código de Protección y Defensa del Consumidor,
					toda empresa debe contar con un Libro de Reclamaciones. El
					proveedor debe dar respuesta en un plazo máximo de{' '}
					{org.responseDeadlineDays} días calendario.
				</p>
			</div>
		</main>
	)
}

export default StoreComplaintPage
