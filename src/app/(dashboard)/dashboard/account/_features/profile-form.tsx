'use client'

import { Mail, User } from 'lucide-react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useForm } from '@/hooks/use-form'
import { $updateProfileAction } from '@/modules/account/actions'
import { validateName } from '@/modules/account/validation'

interface ProfileFormValues {
	name: string | null
}

interface ProfileFormProps {
	user: {
		name: string
		email: string
	}
}

export function ProfileForm({ user }: ProfileFormProps) {
	const initialValues: ProfileFormValues = { name: user.name }

	const [values, setValues] = useState<ProfileFormValues>(initialValues)
	const [isPending, startTransition] = useTransition()
	const { register, validate } = useForm({ values, setValues, initialValues })

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $updateProfileAction({ name: values.name })

			if ('error' in result) {
				sileo.error({
					title: 'Error al guardar',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Perfil actualizado' })
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<User className='size-4' />
					Información personal
				</CardTitle>
				<CardDescription>
					Actualiza tu nombre y datos de perfil.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<TextField
						{...register('name')}
						label='Nombre completo'
						placeholder='Tu nombre'
						validate={validateName}
						prefix={<User className='size-3.5' />}
						disabled={isPending}
					/>
					<TextField
						label='Email'
						placeholder='Tu nombre'
						value={user.email}
						prefix={<Mail className='size-3.5' />}
						disabled
					/>
				</div>

				<div className='flex justify-end'>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Guardando...' : 'Guardar cambios'}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
