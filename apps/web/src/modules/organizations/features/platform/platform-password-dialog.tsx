import { Lock } from 'lucide-react'
import type { FC } from 'react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { validateLoginPassword } from '@/modules/identity/validation'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { useForm } from '@/shared/hooks/use-form'
import type { OrganizationStatusChangeResult } from './api'
import type { OrganizationRow } from './types'

interface PasswordValues {
	password: string | null
}

const INITIAL_VALUES: PasswordValues = { password: null }

export interface PlatformPasswordAction {
	organization: OrganizationRow
	status: 'active' | 'suspended'
	reason: string
}

interface PlatformPasswordDialogProps {
	action: PlatformPasswordAction | null
	onClose: () => void
	onConfirm: (password: string) => Promise<OrganizationStatusChangeResult>
}

export const PlatformPasswordDialog: FC<PlatformPasswordDialogProps> = ({
	action,
	onClose,
	onConfirm,
}) => {
	const [values, setValues] = useState<PasswordValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()
	const { register, reset, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen || isPending) {
			return
		}

		reset()
		onClose()
	}

	const handleSubmit = () => {
		if (!action || validate({ focus: 'first' }).length > 0) {
			return
		}

		startTransition(async () => {
			const result = await onConfirm(values.password ?? '')

			if ('error' in result) {
				sileo.error({
					title: 'No se pudo confirmar la acción',
					description: result.error,
				})

				return
			}

			reset()
			onClose()
		})
	}

	const actionLabel =
		action?.status === 'suspended' ? 'suspender' : 'reactivar'

	return (
		<Dialog open={Boolean(action)} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-md' showCloseButton={!isPending}>
				<DialogHeader>
					<DialogTitle>Confirma tu contraseña</DialogTitle>
					<DialogDescription>
						Vuelve a ingresar tu contraseña para {actionLabel} a{' '}
						<strong>{action?.organization.name}</strong>. Esta
						acción siempre requiere tu contraseña, incluso con una
						sesión SSO.
					</DialogDescription>
				</DialogHeader>

				<TextField
					{...register('password')}
					label='Contraseña'
					placeholder='Tu contraseña'
					type='password'
					prefix={<Lock className='size-3.5' />}
					validate={validateLoginPassword}
					disabled={isPending}
				/>

				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						disabled={isPending}
						onClick={() => handleOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type='button'
						disabled={isPending}
						onClick={handleSubmit}
					>
						{isPending ? 'Confirmando...' : 'Confirmar acción'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
