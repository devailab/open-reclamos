import { Skeleton } from '@/shared/components/ui/skeleton'
import { ADDRESS_TYPE_OPTIONS } from '@/shared/constants/options'
import type { PublicOrganization } from './api'

interface PublicBookHeaderProps {
	org?: PublicOrganization
	storeName?: string
}

export function PublicBookHeader({ org, storeName }: PublicBookHeaderProps) {
	const addressType =
		ADDRESS_TYPE_OPTIONS.find((option) => option.value === org?.addressType)
			?.label ??
		org?.addressType ??
		''

	return (
		<header className='mb-8 text-center' aria-busy={!org}>
			<div className='grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2'>
				<div className='size-12'>
					{org?.logoKey ? (
						<img
							src={`/api/logos/${org.slug}`}
							alt={org.name}
							width={48}
							height={48}
							className='size-12 object-contain'
						/>
					) : null}
				</div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Libro de Reclamaciones
				</h1>
			</div>
			<div className='mt-1 min-h-5 text-sm text-muted-foreground'>
				{org ? (
					storeName ? (
						`${org.name} — ${storeName}`
					) : (
						org.name
					)
				) : (
					<Skeleton className='mx-auto h-5 w-48' />
				)}
			</div>
			<div className='mt-3 space-y-0.5 text-sm text-muted-foreground'>
				<div className='min-h-5'>
					{org ? (
						<p>RUC: {org.taxId}</p>
					) : (
						<Skeleton className='mx-auto h-5 w-40' />
					)}
				</div>
				<div className='min-h-5'>
					{org ? (
						<p>Razón social: {org.legalName}</p>
					) : (
						<Skeleton className='mx-auto h-5 w-64 max-w-full' />
					)}
				</div>
				<div className='min-h-5'>
					{org ? (
						<p>
							Dirección: {addressType} {org.address}
						</p>
					) : (
						<Skeleton className='mx-auto h-5 w-56 max-w-full' />
					)}
				</div>
				<div className='min-h-5'>
					{org?.website ? (
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
					) : null}
				</div>
			</div>
			{!org ? (
				<p role='status' className='sr-only'>
					Cargando datos de la empresa...
				</p>
			) : null}
		</header>
	)
}

export function PublicBookFallback() {
	return (
		<main className='min-h-screen bg-muted/30'>
			<div className='mx-auto max-w-2xl px-4 py-8'>
				<PublicBookHeader />
			</div>
		</main>
	)
}
