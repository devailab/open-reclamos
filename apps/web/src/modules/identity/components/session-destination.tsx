import { Navigate } from 'react-router'
import { Button } from '@/shared/components/ui/button'
import { getSessionDestination } from '../api'
import { useAuthQuery } from '../hooks/use-auth-query'

export function SessionDestination() {
	const destination = useAuthQuery(getSessionDestination)

	if (destination.loading) {
		return <p role='status'>Comprobando acceso...</p>
	}

	if (destination.error) {
		return (
			<div role='alert'>
				<p>{destination.error}</p>
				<Button onClick={destination.retry}>Reintentar</Button>
			</div>
		)
	}

	return destination.data ? <Navigate to={destination.data} replace /> : null
}
