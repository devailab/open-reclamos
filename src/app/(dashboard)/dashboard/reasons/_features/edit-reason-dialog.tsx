'use client'

import { type FC, useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from '@/hooks/use-form'
import { $updateReasonAction } from '@/modules/reasons/actions'
import { validateReason } from '@/modules/reasons/validation'
import type { ReasonNode } from './types'

interface EditReasonDialogProps {
	reason: ReasonNode | null
	onClose: () => void
	onSuccess: () => void
}

interface FormValues {
	reason: string | null
}

export const EditReasonDialog: FC<EditReasonDialogProps> = ({
	reason,
	onClose,
	onSuccess,
}) => {
	const open = reason !== null
	const [values, setValues] = useState<FormValues>({ reason: null })
	const [isPending, startTransition] = useTransition()

	const initialValues: FormValues = { reason: reason?.reason ?? null }
	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues,
	})

	// Sincronizar el formulario cuando cambia el motivo a editar
	useEffect(() => {
		if (reason) {
			setValues({ reason: reason.reason })
		}
	}, [reason])

	const handleSubmit = () => {
		if (!reason) return
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $updateReasonAction({
				id: reason.id,
				reason: values.reason ?? '',
			})

			if ('error' in result) {
				sileo.error({
					title: 'Error al actualizar',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Motivo actualizado' })
			onSuccess()
		})
	}

	const handleClose = () => {
		reset()
		onClose()
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className='sm:max-w-sm'>
				<DialogHeader>
					<DialogTitle>Editar motivo</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<TextField
						{...register('reason')}
						label='Motivo'
						placeholder='Ej. Producto defectuoso'
						validate={validateReason}
						disabled={isPending}
					/>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={handleClose}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
