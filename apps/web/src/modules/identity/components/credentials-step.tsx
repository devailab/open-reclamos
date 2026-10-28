import { type FC, useState, useTransition } from 'react'
import type { SelectOption } from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useForm } from '@/shared/hooks/use-form'
import {
	validateConfirmPassword,
	validateEmail,
	validateLastName,
	validateName,
	validatePassword,
} from '../validation'
import { UserDocumentFields } from './user-document-fields'

interface CredentialsValues {
	name: string | null
	lastName: string | null
	email: string | null
	documentType: SelectOption | null
	documentNumber: string | null
	password: string | null
	confirmPassword: string | null
}

const INITIAL_VALUES: CredentialsValues = {
	name: null,
	lastName: null,
	email: null,
	documentType: null,
	documentNumber: null,
	password: null,
	confirmPassword: null,
}

interface CredentialsStepProps {
	submitLabel: string
	onSubmit: (values: {
		name: string
		lastName: string
		email: string
		password: string
		documentType: string
		documentNumber: string
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

		if (errors.length > 0) {
			return
		}

		startTransition(async () => {
			await onSubmit({
				name: values.name ?? '',
				lastName: values.lastName ?? '',
				email: values.email ?? '',
				password: values.password ?? '',
				documentType: values.documentType?.value ?? '',
				documentNumber: values.documentNumber ?? '',
			})
		})
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
			<TextField
				{...register('name')}
				label='Nombres'
				placeholder='Juan Carlos'
				validate={validateName}
				disabled={isPending}
			/>
			<TextField
				{...register('lastName')}
				label='Apellidos'
				placeholder='Pérez García'
				validate={validateLastName}
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
			<UserDocumentFields
				documentType={register('documentType')}
				documentNumber={register('documentNumber')}
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
