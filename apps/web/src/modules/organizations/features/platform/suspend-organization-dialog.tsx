import type { FC } from 'react'
import { useState } from 'react'
import { sileo } from 'sileo'
import TextAreaField from '@/shared/components/forms/textarea-field'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import type { OrganizationRow } from './types'
import { normalizeSuspensionReason, validateSuspensionReason } from './types'

interface SuspendOrganizationDialogProps {
	organization: OrganizationRow | null
	onClose: () => void
	onConfirm: (organization: OrganizationRow, reason: string) => void
}

export const SuspendOrganizationDialog: FC<SuspendOrganizationDialogProps> = ({
	organization,
	onClose,
	onConfirm,
}) => {
	const [reason, setReason] = useState<string | null>(null)

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			return
		}

		setReason(null)
		onClose()
	}

	const handleSubmit = () => {
		if (!organization) {
			return
		}

		const normalizedReason = normalizeSuspensionReason(reason)
		const validationError = validateSuspensionReason(normalizedReason)

		if (validationError) {
			sileo.error({
				title: 'Error al suspender organización',
				description: validationError,
			})

			return
		}

		setReason(null)
		onClose()
		onConfirm(organization, normalizedReason ?? '')
	}

	return (
		<Dialog open={Boolean(organization)} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>Suspender organización</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<div className='rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm'>
						<p className='font-medium'>{organization?.name}</p>
						<p className='mt-1 text-muted-foreground'>
							Sus usuarios perderán el acceso al dashboard y a la
							API, y sus formularios públicos dejarán de recibir
							reclamos hasta que la reactives.
						</p>
					</div>

					<TextAreaField
						label='Motivo de la suspensión'
						placeholder='Ej. Incumplimiento de las condiciones del servicio.'
						value={reason}
						onValueChange={setReason}
						emptyAsNull
						rows={3}
					/>
					<p className='text-xs text-muted-foreground'>
						El motivo queda registrado en la auditoría y se muestra
						a los usuarios de la organización.
					</p>
				</div>

				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={() => handleOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type='button'
						variant='destructive'
						onClick={handleSubmit}
					>
						Suspender
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
