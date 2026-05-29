'use client'

import Link from 'next/link'
import { type FC, useState } from 'react'
import { sileo } from 'sileo'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { feedback } from '@/lib/feedback'
import {
	$registerAction,
	$sendRegistrationVerificationAction,
	$verifyAndRegisterAction,
} from '@/modules/auth/actions'
import { CredentialsStep } from './credentials-step'
import { VerifyEmailStep } from './verify-email-step'

type Step = 'credentials' | 'verify-email'

interface PendingCredentials {
	name: string
	email: string
	password: string
}

interface RegisterFormProps {
	isFirstUser?: boolean
	emailVerificationEnabled?: boolean
}

export const RegisterForm: FC<RegisterFormProps> = ({
	isFirstUser = false,
	emailVerificationEnabled = false,
}) => {
	const [step, setStep] = useState<Step>('credentials')
	const [pendingCredentials, setPendingCredentials] =
		useState<PendingCredentials | null>(null)

	const cardDescription =
		step === 'verify-email'
			? 'Ingresa el código enviado a tu correo'
			: isFirstUser
				? 'Estás configurando la plataforma por primera vez.'
				: 'Completa los datos para registrarte en la plataforma'

	const submitLabel = emailVerificationEnabled
		? 'Continuar'
		: isFirstUser
			? 'Crear cuenta de administrador'
			: 'Crear cuenta'

	const handleCredentialsSubmit = async (values: PendingCredentials) => {
		if (!emailVerificationEnabled) {
			const result = await $registerAction(
				values.name,
				values.email,
				values.password,
			)
			if (result?.error) {
				feedback.alert.error({
					title: 'Error al crear cuenta',
					description: result.error,
				})
			}
			return
		}

		const result = await $sendRegistrationVerificationAction(
			values.name,
			values.email,
			values.password,
		)
		if (result?.error) {
			feedback.alert.error({
				title: 'Error al enviar código',
				description: result.error,
			})
			return
		}

		setPendingCredentials(values)
		setStep('verify-email')
	}

	const handleVerifySubmit = async (code: string) => {
		if (!pendingCredentials) return

		const result = await $verifyAndRegisterAction(
			pendingCredentials.email,
			code,
		)

		if (result?.error) {
			feedback.alert.error({
				title: 'Error al verificar código',
				description: result.error,
			})
		}
	}

	const handleResend = async () => {
		if (!pendingCredentials) return

		const result = await $sendRegistrationVerificationAction(
			pendingCredentials.name,
			pendingCredentials.email,
			pendingCredentials.password,
		)

		if (result?.error) {
			feedback.alert.error({
				title: 'Error al reenviar código',
				description: result.error,
			})
		} else {
			sileo.success({ title: 'Código reenviado a tu correo' })
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{isFirstUser
						? 'Bienvenido a Open Reclamos'
						: 'Crear cuenta'}
				</CardTitle>
				<CardDescription>{cardDescription}</CardDescription>
			</CardHeader>
			<CardContent>
				{step === 'credentials' ? (
					<CredentialsStep
						submitLabel={submitLabel}
						onSubmit={handleCredentialsSubmit}
					/>
				) : (
					<VerifyEmailStep
						email={pendingCredentials?.email ?? ''}
						onSubmit={handleVerifySubmit}
						onResend={handleResend}
					/>
				)}
			</CardContent>
			{!isFirstUser && step === 'credentials' && (
				<CardFooter className='justify-center text-sm text-muted-foreground'>
					¿Ya tienes cuenta?&nbsp;
					<Link
						href='/login'
						className='text-primary hover:underline'
					>
						Inicia sesión
					</Link>
				</CardFooter>
			)}
		</Card>
	)
}
