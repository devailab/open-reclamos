import type { ReactNode } from 'react'
import { Separator } from '@/shared/components/ui/separator'
import type { PublicOrganization } from './api'
import { PublicBookHeader } from './header-skeleton'
import { TrackingPanel } from './tracking-panel'

interface ComplaintPageLayoutProps {
	org?: PublicOrganization
	storeName?: string
	children: ReactNode
}

export function ComplaintPageLayout({
	org,
	storeName,
	children,
}: ComplaintPageLayoutProps) {
	return (
		<main className='min-h-screen bg-muted/30'>
			<div className='mx-auto max-w-2xl px-4 py-8'>
				<PublicBookHeader org={org} storeName={storeName} />

				{children}

				{org ? (
					<>
						<TrackingPanel organizationSlug={org.slug} />

						<Separator className='mt-5' />

						<div className='mt-6 space-y-2 text-xs text-muted-foreground'>
							<p>
								El proveedor debe atender y responder el reclamo
								o queja dentro del plazo aplicable según la
								normativa vigente. Para esta organización, el
								plazo informado es de {org.responseDeadlineDays}{' '}
								días calendario. La presentación de un reclamo o
								queja no limita el acceso a otras vías de
								solución de controversias ni constituye un
								requisito previo para acudir al INDECOPI.
							</p>
							<p>
								El Libro de Reclamaciones virtual de {org.name}{' '}
								se encuentra disponible a través de Open
								Reclamos, que actúa como intermediario
								tecnológico en el marco del Código de Protección
								y Defensa del Consumidor. Open Reclamos no
								gestiona ni responde los reclamos o quejas
								presentados. Los datos personales serán
								conservados durante el tiempo exigido por la
								normativa aplicable.
							</p>
						</div>
					</>
				) : null}
			</div>
		</main>
	)
}
