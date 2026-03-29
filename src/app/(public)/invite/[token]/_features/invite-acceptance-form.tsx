'use client'

import Link from 'next/link'
import { type FC, type FormEvent, useState, useTransition } from 'react'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useForm } from '@/hooks/use-form'
import { feedback } from '@/lib/feedback'
import { $acceptInvitationAction } from '@/modules/users/actions'
import {
	normalizeAcceptInvitationInput,
	validateAcceptInvitationInput,
} from '@/modules/users/validation'

interface InviteAcceptanceFormProps {
	token: string
	email: string
	isDisabled?: boolean
}

interface InviteAcceptanceValues {
	name: string | null
	password: string | null
	confirmPassword: string | null
}

const INITIAL_VALUES: InviteAcceptanceValues = {
	name: null,
	password: null,
	confirmPassword: null,
}

export const InviteAcceptanceForm: FC<InviteAcceptanceFormProps> = ({
	token,
	email,
	isDisabled = false,
}) => {
	const [values, setValues] = useState<InviteAcceptanceValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()
	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		const payload = normalizeAcceptInvitationInput({
			token,
			name: values.name ?? '',
			password: values.password ?? '',
			confirmPassword: values.confirmPassword ?? '',
		})

		const validationError = validateAcceptInvitationInput(payload)
		if (validationError) {
			feedback.alert.error({
				title: 'Revisa tus datos',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $acceptInvitationAction(payload)
			if ('error' in result) {
				feedback.alert.error({
					title: 'No se pudo completar el registro',
					description: result.error,
				})
			}
		})
	}

	return (
		<Card className='w-full max-w-lg'>
			<CardHeader>
				<CardTitle>Crear cuenta</CardTitle>
				<CardDescription>
					Usa este formulario para activar tu acceso con el correo{' '}
					{email}.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className='space-y-4' onSubmit={handleSubmit}>
					<TextField
						{...register('name')}
						label='Nombre completo'
						placeholder='Juan Pérez'
						disabled={isPending || isDisabled}
					/>
					<TextField
						value={email}
						label='Correo electrónico'
						disabled
					/>
					<TextField
						{...register('password')}
						label='Contraseña'
						placeholder='••••••••'
						type='password'
						disabled={isPending || isDisabled}
					/>
					<TextField
						{...register('confirmPassword')}
						label='Confirmar contraseña'
						placeholder='••••••••'
						type='password'
						disabled={isPending || isDisabled}
					/>
					<Button
						type='submit'
						className='w-full'
						disabled={isPending || isDisabled}
					>
						{isPending ? <Spinner /> : 'Crear cuenta y entrar'}
					</Button>
				</form>
			</CardContent>
			<CardFooter className='justify-center text-sm text-muted-foreground'>
				¿Ya tienes acceso?&nbsp;
				<Link href='/login' className='text-primary hover:underline'>
					Inicia sesión
				</Link>
			</CardFooter>
		</Card>
	)
}
