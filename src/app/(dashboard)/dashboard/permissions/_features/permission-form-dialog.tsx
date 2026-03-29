'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextField from '@/components/forms/text-field'
import TextAreaField from '@/components/forms/textarea-field'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import {
	$createPermissionAction,
	$updatePermissionAction,
} from '@/modules/permissions/actions'
import {
	normalizePermissionMutationInput,
	type PermissionMutationInput,
	validatePermissionMutationInput,
} from '@/modules/permissions/validation'
import type { PermissionRow } from './types'

interface PermissionFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	permission: PermissionRow | null
	onSuccess: (moduleName: string) => void
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

export function PermissionFormDialog({
	open,
	onOpenChange,
	permission,
	onSuccess,
}: PermissionFormDialogProps) {
	const [values, setValues] = useState<PermissionFormValues>(EMPTY_VALUES)
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

	const title = permission ? 'Editar permiso' : 'Nuevo permiso'
	const description = permission
		? 'Actualiza el nombre, módulo o descripción del permiso personalizado.'
		: 'Crea un permiso personalizado para necesidades específicas de tu organización.'

	const payload = useMemo<PermissionMutationInput>(
		() => ({
			name: values.name ?? '',
			module: values.module ?? '',
			description: values.description ?? null,
		}),
		[values],
	)

	const handleClose = (nextOpen: boolean) => {
		if (!nextOpen) {
			setValues(EMPTY_VALUES)
		}
		onOpenChange(nextOpen)
	}

	const handleSubmit = () => {
		const normalizedInput = normalizePermissionMutationInput(payload)
		const validationError = validatePermissionMutationInput(normalizedInput)
		if (validationError) {
			sileo.error({
				title: permission
					? 'Error al actualizar permiso'
					: 'Error al crear permiso',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = permission
				? await $updatePermissionAction(permission.id, payload)
				: await $createPermissionAction(payload)

			if ('error' in result) {
				sileo.error({
					title: permission
						? 'Error al actualizar permiso'
						: 'Error al crear permiso',
					description: result.error,
				})
				return
			}

			sileo.success({
				title: permission ? 'Permiso actualizado' : 'Permiso creado',
			})
			handleClose(false)
			onSuccess(normalizedInput.module)
		})
	}

	return (
		<ResponsiveModal
			open={open}
			onOpenChange={handleClose}
			title={title}
			description={description}
			className='sm:max-w-lg'
		>
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
					label='Módulo'
					placeholder='reportes'
					value={values.module}
					onValueChange={(value) =>
						setValues((previous) => ({
							...previous,
							module: value,
						}))
					}
					disabled={isPending}
				/>
				<TextAreaField
					label='Descripción'
					placeholder='Permite exportar reportes administrativos.'
					value={values.description}
					onValueChange={(value) =>
						setValues((previous) => ({
							...previous,
							description: value,
						}))
					}
					disabled={isPending}
					rows={3}
				/>
			</div>

			<div className='mt-6 flex justify-end gap-2'>
				<Button
					type='button'
					variant='outline'
					onClick={() => handleClose(false)}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<Button
					type='button'
					onClick={handleSubmit}
					disabled={isPending}
				>
					{permission ? 'Guardar cambios' : 'Crear permiso'}
				</Button>
			</div>
		</ResponsiveModal>
	)
}
