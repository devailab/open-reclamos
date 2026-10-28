import { ShieldCheck } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { navigateSession } from '../action-scope'
import { getInstallationStatus, installPlatform } from '../api'
import { CredentialsStep } from '../components/credentials-step'
import { useActionScope } from '../hooks/use-action-scope'
import { useAuthQuery } from '../hooks/use-auth-query'
import { errorMessage } from '../validation'

export function InstallPage() {
	const status = useAuthQuery(getInstallationStatus)
	const { refresh } = useSession()
	const navigate = useNavigate()
	const actions = useActionScope()

	if (status.loading) {
		return <p role='status'>Comprobando instalación...</p>
	}
	if (status.data?.installed) {
		return <Navigate to='/login' replace />
	}

	return (
		<Card className='py-6'>
			<CardHeader className='px-6'>
				<ShieldCheck className='size-5 text-primary' />
				<CardTitle>Configuración inicial de la plataforma</CardTitle>
				<CardDescription>
					Crea el primer administrador para comenzar a configurar tu
					empresa.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-5 px-6'>
				{status.error ? (
					<div role='alert'>
						<p>{status.error}</p>
						<Button onClick={status.retry}>Reintentar</Button>
					</div>
				) : (
					<CredentialsStep
						submitLabel='Crear administrador'
						onSubmit={async (values) => {
							const signal = actions.begin()

							try {
								const destination = await installPlatform(
									values,
									signal,
								)

								navigateSession(
									destination,
									signal,
									navigate,
									refresh,
								)
							} catch (error) {
								if (signal.aborted) {
									return
								}

								sileo.error({
									title: 'No se pudo completar la instalación',
									description: errorMessage(error),
								})
							}
						}}
					/>
				)}
				<Link
					to='/login'
					className='block text-sm text-primary hover:underline'
				>
					Ir a iniciar sesión
				</Link>
			</CardContent>
		</Card>
	)
}
