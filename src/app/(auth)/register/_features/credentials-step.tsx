'use client'

import { type FC, useState, useTransition } from 'react'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useForm } from '@/hooks/use-form'
import {
	validateConfirmPassword,
	validateEmail,
	validateName,
	validatePassword,
} from '@/modules/auth/validation'

interface CredentialsValues {
	name: string | null
	email: string | null
	password: string | null
	confirmPassword: string | null
}

const INITIAL_VALUES: CredentialsValues = {
	name: null,
	email: null,
	password: null,
	confirmPassword: null,
}

interface CredentialsStepProps {
	submitLabel: string
	onSubmit: (values: {
		name: string
		email: string
		password: string
	}) => Promise<void>
}

export const CredentialsStep: FC<CredentialsStepProps> = ({
	submitLabel,
	onSubmit,
}) => {
	const [values, setValues] = useState<CredentialsValues>(INITIAL_VALUES)
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
			await onSubmit({
				name: values.name ?? '',
				email: values.email ?? '',
				password: values.password ?? '',
			})
		})
	}

	return (
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
			<Button type='submit' className='w-full mt-2' disabled={isPending}>
				{isPending ? <Spinner /> : submitLabel}
			</Button>
		</form>
	)
}
