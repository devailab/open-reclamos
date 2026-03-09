'use client'

import { type FC, useState, useTransition } from 'react'
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
import { $createReasonAction } from '@/modules/reasons/actions'
import { validateReason } from '@/modules/reasons/validation'

interface CreateReasonDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	parentId: string | null
	parentReason: string | null
	onSuccess: () => void
}

interface FormValues {
	reason: string | null
}

const INITIAL_VALUES: FormValues = { reason: null }

export const CreateReasonDialog: FC<CreateReasonDialogProps> = ({
	open,
	onOpenChange,
	parentId,
	parentReason,
	onSuccess,
}) => {
	const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
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
			const result = await $createReasonAction({
				reason: values.reason ?? '',
				parentId,
			})

			if ('error' in result) {
				sileo.error({
					title: 'Error al crear',
					description: result.error,
				})
				return
			}

			sileo.success({
				title: parentId ? 'Submotivo creado' : 'Motivo creado',
			})
			reset()
			onSuccess()
		})
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) reset()
		onOpenChange(isOpen)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-sm'>
				<DialogHeader>
					<DialogTitle>
						{parentId ? 'Nuevo submotivo' : 'Nuevo motivo'}
					</DialogTitle>
					{parentReason && (
						<p className='text-sm text-muted-foreground'>
							Bajo:{' '}
							<span className='font-medium text-foreground'>
								{parentReason}
							</span>
						</p>
					)}
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
						onClick={() => handleOpenChange(false)}
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
