import { type FC, useState, useTransition } from 'react'
import { Link, useNavigate } from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { Spinner } from '@/shared/components/ui/spinner'
import { useForm } from '@/shared/hooks/use-form'
import { navigateSession } from '../action-scope'
import { authenticateLocal, resendVerification, verifyEmail } from '../api'
import { useActionScope } from '../hooks/use-action-scope'
import {
	errorMessage,
	validateEmail,
	validateLoginPassword,
} from '../validation'
import {
	EmailVerificationStep,
	notifyCodeNotSent,
} from './email-verification-step'

interface LoginValues {
	email: string | null
	password: string | null
}

const INITIAL_VALUES: LoginValues = {
	email: null,
	password: null,
}

interface LoginFormProps {
	showRegisterLink?: boolean
	organizationSlug?: string
}

export const LoginForm: FC<LoginFormProps> = ({
	showRegisterLink = false,
	organizationSlug,
}) => {
	const navigate = useNavigate()
	const { refresh } = useSession()
	const actions = useActionScope()
	const [values, setValues] = useState<LoginValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()
	// Email pendiente de verificar tras una contraseña correcta.
	const [pendingEmail, setPendingEmail] = useState<string | null>(null)

	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const credentials = () => ({
		email: values.email ?? '',
		password: values.password ?? '',
	})

	const handleVerify = async (code: string) => {
		const signal = actions.begin()

		try {
			const destination = await verifyEmail(
				{ email: pendingEmail ?? '', code },
				organizationSlug,
				signal,
			)

			navigateSession(destination, signal, navigate, refresh)
		} catch (error) {
			if (signal.aborted) {
				return
			}

			sileo.error({
				title: 'No se pudo verificar el correo',
				description: errorMessage(error),
			})
		}
	}

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()

		const errors = validate({ focus: 'first' })

		if (errors.length > 0) {
			return
		}

		const signal = actions.begin()

		startTransition(async () => {
			try {
				const outcome = await authenticateLocal(
					credentials(),
					organizationSlug,
					signal,
				)

				if (outcome.verificationRequired) {
					setPendingEmail(outcome.email)

					if (!outcome.emailSent) {
						notifyCodeNotSent()
					}
					return
				}

				navigateSession(outcome.destination, signal, navigate, refresh)
			} catch (error) {
				if (signal.aborted) {
					return
				}

				sileo.error({
					title: 'Error al iniciar sesión',
					description: errorMessage(error),
				})
			}
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{pendingEmail ? 'Verifica tu correo' : 'Iniciar sesión'}
				</CardTitle>
				<CardDescription>
					{pendingEmail
						? 'Confirma tu correo para terminar de activar la cuenta'
						: 'Ingresa tus credenciales para acceder a tu cuenta'}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{pendingEmail ? (
					<EmailVerificationStep
						email={pendingEmail}
						onVerify={handleVerify}
						onResend={async () => {
							const signal = actions.begin()

							const destination = await resendVerification(
								credentials(),
								organizationSlug,
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
						onBack={() => setPendingEmail(null)}
					/>
				) : (
					<form
						onSubmit={handleSubmit}
						className='flex flex-col gap-4'
					>
						<TextField
							{...register('email')}
							label='Correo electrónico'
							placeholder='tu@correo.com'
							type='email'
							validate={validateEmail}
							disabled={isPending}
						/>
						<TextField
							{...register('password')}
							label='Contraseña'
							placeholder='••••••••'
							type='password'
							validate={validateLoginPassword}
							disabled={isPending}
						/>
						<Button
							type='submit'
							className='w-full mt-2'
							disabled={isPending}
						>
							{isPending ? <Spinner /> : 'Iniciar sesión'}
						</Button>
					</form>
				)}
			</CardContent>
			{showRegisterLink && (
				<CardFooter className='justify-center text-sm text-muted-foreground'>
					¿No tienes cuenta?&nbsp;
					<Link
						to='/register'
						className='text-primary hover:underline'
					>
						Regístrate
					</Link>
				</CardFooter>
			)}
		</Card>
	)
}
