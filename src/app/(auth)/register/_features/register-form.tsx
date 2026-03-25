'use client'

import Link from 'next/link'
import { type FC, useState, useTransition } from 'react'
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
import { $registerAction } from '@/modules/auth/actions'
import {
	validateConfirmPassword,
	validateEmail,
	validateName,
	validatePassword,
} from '@/modules/auth/validation'

interface RegisterValues {
	name: string | null
	email: string | null
	password: string | null
	confirmPassword: string | null
}

const INITIAL_VALUES: RegisterValues = {
	name: null,
	email: null,
	password: null,
	confirmPassword: null,
}

export const RegisterForm: FC = () => {
	const [values, setValues] = useState<RegisterValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()

	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()

		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $registerAction(
				values.name ?? '',
				values.email ?? '',
				values.password ?? '',
			)
			if (result?.error) {
				feedback.alert.error({
					title: 'Error al crear cuenta',
					description: result.error,
				})
			}
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Crear cuenta</CardTitle>
				<CardDescription>
					Completa los datos para registrarte en la plataforma
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
					<TextField
						{...register('name')}
						label='Nombre completo'
						placeholder='Juan Pérez'
						validate={validateName}
						disabled={isPending}
					/>
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
						validate={validatePassword}
						disabled={isPending}
					/>
					<TextField
						{...register('confirmPassword')}
						label='Confirmar contraseña'
						placeholder='••••••••'
						type='password'
						validate={validateConfirmPassword(values.password)}
						disabled={isPending}
					/>
					<Button
						type='submit'
						className='w-full mt-2'
						disabled={isPending}
					>
						{isPending ? <Spinner /> : 'Crear cuenta'}
					</Button>
				</form>
			</CardContent>
			<CardFooter className='justify-center text-sm text-muted-foreground'>
				¿Ya tienes cuenta?&nbsp;
				<Link href='/login' className='text-primary hover:underline'>
					Inicia sesión
				</Link>
			</CardFooter>
		</Card>
	)
}
