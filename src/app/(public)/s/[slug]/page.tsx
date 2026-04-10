import type { Metadata, NextPage } from 'next'
import { notFound } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
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
						turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''}
					/>
				)}

				<TrackingPanel organizationId={org.id} />

				<Separator className='mt-5' />

				<div className='mt-6 space-y-2 text-xs text-muted-foreground'>
					<p>
						El proveedor debe atender y responder el reclamo o queja
						dentro del plazo aplicable según la normativa vigente.
						Para esta organización, el plazo informado es de{' '}
						{org.responseDeadlineDays} días calendario. La
						presentación de un reclamo o queja no limita el acceso a
						otras vías de solución de controversias ni constituye un
						requisito previo para acudir al INDECOPI.
					</p>
					<p>
						El Libro de Reclamaciones virtual de {org.name} se
						encuentra disponible a través de Open Reclamos, que
						actúa como intermediario tecnológico en el marco del
						Código de Protección y Defensa del Consumidor. Open
						Reclamos no gestiona ni responde los reclamos o quejas
						presentados. Los datos personales serán conservados
						durante el tiempo exigido por la normativa aplicable.
					</p>
				</div>
			</div>
		</main>
	)
}

export default StoreComplaintPage
