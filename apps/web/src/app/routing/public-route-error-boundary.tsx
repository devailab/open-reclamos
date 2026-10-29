import { useRevalidator, useRouteError } from 'react-router'
import { Button } from '@/shared/components/ui/button'

export function PublicRouteErrorBoundary() {
	const cause = useRouteError()
	const revalidator = useRevalidator()
	const message =
		cause instanceof Error
			? cause.message
			: 'No se pudo cargar el formulario.'

	return (
		<main className='min-h-screen bg-muted/30'>
			<div className='mx-auto max-w-2xl space-y-4 px-4 py-8' role='alert'>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Libro de Reclamaciones
				</h1>
				<p>{message}</p>
				<Button
					onClick={() => void revalidator.revalidate()}
					disabled={revalidator.state === 'loading'}
				>
					Reintentar
				</Button>
			</div>
		</main>
	)
}
