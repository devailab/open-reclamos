'use client'

import { KeyRound, Lock } from 'lucide-react'
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
import { $changePasswordAction } from '@/modules/account/actions'
import {
	validateConfirmPassword,
	validateCurrentPassword,
	validateNewPassword,
} from '@/modules/account/validation'

interface ChangePasswordValues {
	currentPassword: string | null
	newPassword: string | null
	confirmPassword: string | null
}

const INITIAL_VALUES: ChangePasswordValues = {
	currentPassword: null,
	newPassword: null,
	confirmPassword: null,
}

export function ChangePasswordForm() {
	const [values, setValues] = useState<ChangePasswordValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()
	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $changePasswordAction({
				currentPassword: values.currentPassword,
				newPassword: values.newPassword,
			})

			if ('error' in result) {
				sileo.error({
					title: 'Error al cambiar contraseña',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Contraseña actualizada correctamente' })
			reset()
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<KeyRound className='size-4' />
					Cambiar contraseña
				</CardTitle>
				<CardDescription>
					Usa al menos 8 caracteres. Recomendamos combinar letras,
					números y símbolos.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<TextField
					{...register('currentPassword')}
					label='Contraseña actual'
					placeholder='Tu contraseña actual'
					type='password'
					validate={validateCurrentPassword}
					prefix={<Lock className='size-3.5' />}
					disabled={isPending}
				/>

				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<TextField
						{...register('newPassword')}
						label='Nueva contraseña'
						placeholder='Mínimo 8 caracteres'
						type='password'
						validate={validateNewPassword}
						prefix={<Lock className='size-3.5' />}
						disabled={isPending}
					/>
					<TextField
						{...register('confirmPassword')}
						label='Confirmar nueva contraseña'
						placeholder='Repite la nueva contraseña'
						type='password'
						validate={validateConfirmPassword(values.newPassword)}
						prefix={<Lock className='size-3.5' />}
						disabled={isPending}
					/>
				</div>

				<div className='flex justify-end'>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Cambiando...' : 'Cambiar contraseña'}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
