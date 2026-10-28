import { Link } from 'react-router'
import { Button } from '../ui/button'

export function ErrorPage({
	error,
	retry,
}: {
	error: Error
	retry: () => void
}) {
	return (
		<div className='space-y-3' role='alert'>
			<h1 className='text-xl font-semibold'>
				No se pudo cargar esta página
			</h1>
			<p>{error.message}</p>
			<Button onClick={retry}>Reintentar</Button>
			<Link to='/login' className='block text-primary'>
				Volver al acceso
			</Link>
		</div>
	)
}
