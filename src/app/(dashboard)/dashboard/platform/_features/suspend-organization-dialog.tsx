'use client'

import type { FC } from 'react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextAreaField from '@/components/forms/textarea-field'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { $suspendOrganizationAction } from '@/modules/platform/actions'
import {
	normalizeSuspensionReason,
	validateSuspensionReason,
} from '@/modules/platform/validation'
import type { OrganizationRow } from './types'

interface SuspendOrganizationDialogProps {
	organization: OrganizationRow | null
	onClose: () => void
	onSuccess: () => void
}

export const SuspendOrganizationDialog: FC<SuspendOrganizationDialogProps> = ({
	organization,
	onClose,
	onSuccess,
}) => {
	const [reason, setReason] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) return
		setReason(null)
		onClose()
	}

	const handleSubmit = () => {
		if (!organization) return

		const normalizedReason = normalizeSuspensionReason(reason)
		const validationError = validateSuspensionReason(normalizedReason)
		if (validationError) {
			sileo.error({
				title: 'Error al suspender organización',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $suspendOrganizationAction(
				organization.id,
				normalizedReason ?? '',
			)

			if ('error' in result) {
				sileo.error({
					title: 'Error al suspender organización',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Organización suspendida' })
			setReason(null)
			onSuccess()
		})
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
						placeholder='Ej. Falta de pago del plan contratado.'
						value={reason}
						onValueChange={setReason}
						disabled={isPending}
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
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						type='button'
						variant='destructive'
						onClick={handleSubmit}
						disabled={isPending}
					>
						Suspender
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
