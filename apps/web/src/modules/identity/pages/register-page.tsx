import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { PageLoading } from '@/shared/components/page-loading'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { navigateSession } from '../action-scope'
import {
	getInstallationStatus,
	registerAccount,
	resendVerification,
	verifyEmail,
} from '../api'
import { CredentialsStep } from '../components/credentials-step'
import {
	EmailVerificationStep,
	notifyCodeNotSent,
} from '../components/email-verification-step'
import { SessionDestination } from '../components/session-destination'
import { useActionScope } from '../hooks/use-action-scope'
import { useAuthQuery } from '../hooks/use-auth-query'
import { errorMessage } from '../validation'

export function RegisterPage() {
	const { session, refresh } = useSession()
	const status = useAuthQuery(getInstallationStatus)
	const navigate = useNavigate()
	const actions = useActionScope()
	// Credenciales en memoria para reenviar el código sin volver a pedirlas.
	const [pending, setPending] = useState<{
		email: string
		password: string
	} | null>(null)

	if (session) {
		return <SessionDestination />
	}
	if (status.loading) {
		return <PageLoading />
	}

	if (status.error) {
		return (
			<div role='alert'>
				{status.error}
				<Button onClick={status.retry}>Reintentar</Button>
			</div>
		)
	}

	if (!status.data?.installed) {
		return <Navigate to='/install' replace />
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{!status.data.public_registration
						? 'Registro cerrado'
						: pending
							? 'Verifica tu correo'
							: 'Crear cuenta'}
				</CardTitle>
				<CardDescription>
					{!status.data.public_registration
						? 'Solicita un enlace de invitación al administrador de tu empresa.'
						: pending
							? 'Ingresa el código para activar tu cuenta.'
							: 'Completa los datos para registrarte en la plataforma'}
				</CardDescription>
			</CardHeader>
			{status.data.public_registration && pending ? (
				<CardContent>
					<EmailVerificationStep
						email={pending.email}
						onVerify={async (code) => {
							const signal = actions.begin()

							try {
								const destination = await verifyEmail(
									{ email: pending.email, code },
									undefined,
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
									title: 'No se pudo verificar el correo',
									description: errorMessage(error),
								})
							}
						}}
						onResend={async () => {
							const signal = actions.begin()

							const destination = await resendVerification(
								pending,
								undefined,
								signal,
							)

							if (destination) {
								navigateSession(
									destination,
									signal,
									navigate,
									refresh,
								)
							}
						}}
						onBack={() => setPending(null)}
					/>
				</CardContent>
			) : status.data.public_registration ? (
				<CardContent>
					<CredentialsStep
						submitLabel='Crear cuenta'
						onSubmit={async (values) => {
							const signal = actions.begin()

							try {
								const outcome = await registerAccount(
									values,
									signal,
								)

								if (outcome.verificationRequired) {
									setPending({
										email: outcome.email,
										password: values.password,
									})

									if (!outcome.emailSent) {
										notifyCodeNotSent()
									}
									return
								}

								navigateSession(
									outcome.destination,
									signal,
									navigate,
									refresh,
								)
							} catch (error) {
								if (signal.aborted) {
									return
								}

								sileo.error({
									title: 'Error al crear cuenta',
									description: errorMessage(error),
								})
							}
						}}
					/>
				</CardContent>
			) : null}
			<CardFooter className='justify-center text-sm text-muted-foreground'>
				¿Ya tienes cuenta?&nbsp;
				<Link to='/login' className='text-primary hover:underline'>
					Inicia sesión
				</Link>
			</CardFooter>
		</Card>
	)
}
