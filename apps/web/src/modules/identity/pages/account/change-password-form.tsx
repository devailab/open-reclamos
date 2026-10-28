import { KeyRound, Lock } from 'lucide-react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
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
import {
	errorMessage,
	validateConfirmPassword,
	validateLoginPassword as validateCurrentPassword,
	validatePassword as validateNewPassword,
} from '../../validation'
import { changePassword } from './api'

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
	const actions = useActionScope()
	const [values, setValues] = useState<ChangePasswordValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()

	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })

		if (errors.length > 0) {
			return
		}

		const signal = actions.begin()

		startTransition(async () => {
			try {
				await changePassword(
					values.currentPassword ?? '',
					values.newPassword ?? '',
					signal,
				)

				signal.throwIfAborted()

				sileo.success({
					title: 'Contraseña actualizada. Se cerraron las otras sesiones.',
				})

				reset()
			} catch (error) {
				if (signal.aborted) {
					return
				}

				sileo.error({
					title: 'Error al cambiar contraseña',
					description: errorMessage(error),
				})
			}
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
					Usa entre 12 y 256 caracteres. Recomendamos combinar letras,
					números y símbolos. Necesitas tu contraseña local actual.
					Este cambio no modifica la contraseña de tu proveedor SSO.
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
						placeholder='Mínimo 12 caracteres'
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
