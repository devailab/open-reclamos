'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { $updatePermissionAction } from '@/modules/permissions/actions'
import {
	normalizePermissionMutationInput,
	type PermissionMutationInput,
	validatePermissionMutationInput,
} from '@/modules/permissions/validation'
import type { PermissionRow } from './types'

interface EditPermissionDialogProps {
	permission: PermissionRow | null
	onClose: () => void
	onSuccess: () => void
}

interface PermissionFormValues {
	name: string | null
	module: string | null
	description: string | null
}

const EMPTY_VALUES: PermissionFormValues = {
	name: null,
	module: null,
	description: null,
}

export function EditPermissionDialog({
	permission,
	onClose,
	onSuccess,
}: EditPermissionDialogProps) {
	const open = permission !== null
	const [values, setValues] = useState(EMPTY_VALUES)
	const [isPending, startTransition] = useTransition()

	useEffect(() => {
		if (!permission) {
			setValues(EMPTY_VALUES)
			return
		}

		setValues({
			name: permission.name,
			module: permission.module,
			description: permission.description,
		})
	}, [permission])

	const handleClose = () => {
		setValues(EMPTY_VALUES)
		onClose()
	}

	const handleSubmit = () => {
		if (!permission) return

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
				title: 'Error al actualizar permiso',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $updatePermissionAction(permission.id, payload)
			if ('error' in result) {
				sileo.error({
					title: 'Error al actualizar permiso',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Permiso actualizado' })
			onSuccess()
		})
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => !nextOpen && handleClose()}
		>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>Editar permiso</DialogTitle>
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
						onClick={handleClose}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Guardando...' : 'Guardar cambios'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
