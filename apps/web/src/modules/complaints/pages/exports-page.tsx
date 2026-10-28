import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { getExportStores, type StoreOption } from '../features/exports/api'
import { ExportForm } from '../features/exports/export-form'

export function ExportsPage() {
	const [stores, setStores] = useState<StoreOption[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [revision, setRevision] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision dispara intencionalmente una nueva carga al pulsar Reintentar.
	useEffect(() => {
		const abort = new AbortController()

		setError(null)

		getExportStores(abort.signal)
			.then((stores) => {
				if (!abort.signal.aborted) {
					setStores(stores)
				}
			})
			.catch((error) => {
				if (!abort.signal.aborted) {
					setError(
						error instanceof Error
							? error.message
							: 'No se pudieron cargar las tiendas.',
					)
				}
			})

		return () => abort.abort()
	}, [revision])

	return (
		<div className='flex flex-col gap-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Exportar
				</h1>
				<p className='text-sm text-muted-foreground mt-1'>
					Descarga el registro de reclamos en PDF o Excel para
					auditorías y fiscalizaciones.
				</p>
			</div>
			{error ? (
				<div role='alert' className='space-y-3'>
					<p>{error}</p>
					<Button
						variant='outline'
						onClick={() => setRevision((value) => value + 1)}
					>
						Reintentar
					</Button>
				</div>
			) : stores ? (
				stores.length ? (
					<ExportForm stores={stores} />
				) : (
					<p className='text-sm text-muted-foreground'>
						No tienes tiendas disponibles para exportar.
					</p>
				)
			) : (
				<Spinner className='size-6' />
			)}
		</div>
	)
}
