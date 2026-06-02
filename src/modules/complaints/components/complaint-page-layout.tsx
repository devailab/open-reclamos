import type { ReactNode } from 'react'
import { OrganizationLogo } from '@/components/organization-logo'
import { Separator } from '@/components/ui/separator'
import { ADDRESS_TYPE_OPTIONS } from '@/lib/constants'
import { TrackingPanel } from './tracking-panel'

interface OrgInfo {
	id: string
	name: string
	logoKey: string | null
	taxId: string
	legalName: string
	address: string
	addressType: string
	website: string | null
	responseDeadlineDays: number
}

interface ComplaintPageLayoutProps {
	org: OrgInfo
	storeName?: string
	children: ReactNode
}

export function ComplaintPageLayout({
	org,
	storeName,
	children,
}: ComplaintPageLayoutProps) {
	const addressLabel = `${ADDRESS_TYPE_OPTIONS.find((o) => o.value === org.addressType)?.label ?? org.addressType} ${org.address}`

	return (
		<main className='min-h-screen bg-muted/30'>
			<div className='mx-auto max-w-2xl px-4 py-8'>
				{/* Header */}
				<div className='mb-8 text-center'>
					<OrganizationLogo
						organizationId={org.id}
						logoKey={org.logoKey}
						name={org.name}
						className='mx-auto mb-4 size-16'
					/>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Libro de Reclamaciones
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						{storeName ? `${org.name} — ${storeName}` : org.name}
					</p>
					<div className='mt-3 space-y-0.5 text-sm text-muted-foreground'>
						<p>RUC: {org.taxId}</p>
						<p>Razón social: {org.legalName}</p>
						<p>Dirección: {addressLabel}</p>
						{org.website && (
							<p>
								Sitio web:{' '}
								<a
									href={org.website}
									target='_blank'
									rel='noopener noreferrer'
									className='underline underline-offset-2'
								>
									{org.website}
								</a>
							</p>
						)}
					</div>
				</div>

				{children}

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
