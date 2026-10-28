import { Mail, User } from 'lucide-react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { useForm } from '@/shared/hooks/use-form'
import { useActionScope } from '../../hooks/use-action-scope'
import { errorMessage, validateLastName, validateName } from '../../validation'
import { updateProfile } from './api'

interface ProfileFormValues {
	name: string | null
	lastName: string | null
}

interface ProfileFormProps {
	user: {
		name: string
		last_name: string
		email: string
	}
}

export function ProfileForm({ user }: ProfileFormProps) {
	const { refresh } = useSession()
	const actions = useActionScope()
	const initialValues: ProfileFormValues = {
		name: user.name,
		lastName: user.last_name,
	}

	const [values, setValues] = useState<ProfileFormValues>(initialValues)
	const [isPending, startTransition] = useTransition()
	const { register, validate } = useForm({ values, setValues, initialValues })

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })

		if (errors.length > 0) {
			return
		}

		const signal = actions.begin()

		startTransition(async () => {
			try {
				await updateProfile(
					values.name ?? '',
					values.lastName ?? '',
					signal,
				)
				signal.throwIfAborted()
				sileo.success({ title: 'Perfil actualizado' })
				void refresh()
			} catch (error) {
				if (signal.aborted) {
					return
				}

				sileo.error({
					title: 'Error al guardar',
					description: errorMessage(error),
				})
			}
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
						label='Nombres'
						placeholder='Tu nombre'
						validate={validateName}
						prefix={<User className='size-3.5' />}
						disabled={isPending}
					/>
					<TextField
						{...register('lastName')}
						label='Apellidos'
						placeholder='Tus apellidos'
						validate={validateLastName}
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
