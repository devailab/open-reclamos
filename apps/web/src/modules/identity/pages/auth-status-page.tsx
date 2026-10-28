import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession } from '@/shared/auth/session'
import { Button } from '@/shared/components/ui/button'
import { navigateSession } from '../action-scope'
import { getSessionDestination } from '../api'
import { useActionScope } from '../hooks/use-action-scope'
import { useAuthQuery } from '../hooks/use-auth-query'

export function AuthStatusPage() {
	const { refresh } = useSession()
	const navigate = useNavigate()
	const actions = useActionScope()
	const completed = useRef(false)
	const result = useAuthQuery(getSessionDestination)
	const destination = result.data

	useEffect(() => {
		if (!destination || completed.current) {
			return
		}

		completed.current = true
		navigateSession(destination, actions.begin(), navigate, refresh)
	}, [destination, actions, navigate, refresh])

	if (result.error) {
		return (
			<div className='space-y-3' role='alert'>
				<p>{result.error}</p>
				<Button onClick={result.retry}>Reintentar</Button>
				<Link to='/login?local=1' className='block text-primary'>
					Volver a iniciar sesión
				</Link>
			</div>
		)
	}

	return <p role='status'>Completando acceso empresarial...</p>
}
