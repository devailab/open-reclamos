'use client'

import { useState, useTransition } from 'react'
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
import { $createPermissionAction } from '@/modules/permissions/actions'
import {
	normalizePermissionMutationInput,
	type PermissionMutationInput,
	validatePermissionMutationInput,
} from '@/modules/permissions/validation'

interface CreatePermissionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

interface PermissionFormValues {
	name: string | null
	module: string | null
	description: string | null
}

const INITIAL_VALUES: PermissionFormValues = {
	name: null,
	module: null,
	description: null,
}

export function CreatePermissionDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreatePermissionDialogProps) {
	const [values, setValues] = useState(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()

	const resetForm = () => {
		setValues(INITIAL_VALUES)
	}

	const handleSubmit = () => {
		const payload: PermissionMutationInput = {
			name: values.name ?? '',
			module: values.module ?? '',
			description: values.description,
		}

		const validationError = validatePermissionMutationInput(
			normalizePermissionMutationInput(payload),
		)
		if (validationError) {
			sileo.error({
				title: 'Error al crear permiso',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $createPermissionAction(payload)
			if ('error' in result) {
				sileo.error({
					title: 'Error al crear permiso',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Permiso creado' })
			resetForm()
			onSuccess()
		})
	}

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) resetForm()
		onOpenChange(nextOpen)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>Nuevo permiso</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<TextField
						label='Nombre'
						placeholder='Gestionar exportaciones'
						value={values.name}
						onValueChange={(value) =>
							setValues((previous) => ({
								...previous,
								name: value,
							}))
						}
						disabled={isPending}
					/>
					<TextField
						label='Modulo'
						placeholder='reports'
						value={values.module}
						onValueChange={(value) =>
							setValues((previous) => ({
								...previous,
								module: value,
							}))
						}
						disabled={isPending}
					/>
					<TextField
						label='Descripcion'
						placeholder='Describe para qué sirve este permiso'
						value={values.description}
						onValueChange={(value) =>
							setValues((previous) => ({
								...previous,
								description: value,
							}))
						}
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
