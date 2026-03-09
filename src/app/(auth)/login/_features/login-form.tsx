'use client'

import Link from 'next/link'
import { type FC, useState, useTransition } from 'react'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useForm } from '@/hooks/use-form'
import { feedback } from '@/lib/feedback'
import { $loginAction } from '@/modules/auth/actions'
import { validateEmail, validatePassword } from '@/modules/auth/validation'

interface LoginValues {
	email: string | null
	password: string | null
}

const INITIAL_VALUES: LoginValues = {
	email: null,
	password: null,
}

export const LoginForm: FC = () => {
	const [values, setValues] = useState<LoginValues>(INITIAL_VALUES)
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
			const result = await $loginAction(
				values.email ?? '',
				values.password ?? '',
			)
			if (result?.error) {
				feedback.alert.error({
					title: 'Error al iniciar sesión',
					description: result.error,
				})
			}
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Iniciar sesión</CardTitle>
				<CardDescription>
					Ingresa tus credenciales para acceder a tu cuenta
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
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
					<Button
						type='submit'
						className='w-full mt-2'
						disabled={isPending}
					>
						{isPending ? <Spinner /> : 'Iniciar sesión'}
					</Button>
				</form>
			</CardContent>
			<CardFooter className='justify-center text-sm text-muted-foreground'>
				¿No tienes cuenta?&nbsp;
				<Link href='/register' className='text-primary hover:underline'>
					Regístrate
				</Link>
			</CardFooter>
		</Card>
	)
}
