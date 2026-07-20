'use client'

import { Info } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
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
import { canGrantPermissionKeys } from '@/modules/rbac/lib'
import type { PermissionOption } from '@/modules/rbac/queries'
import type { RoleDetailRow } from '@/modules/roles/queries'
import {
	normalizeRoleMutationInput,
	type RoleMutationInput,
	validateRoleMutationInput,
} from '@/modules/roles/validation'
import { RolePermissionSelector } from './role-permission-selector'

interface RoleFormValues {
	name: string | null
	description: string | null
}

const INITIAL_VALUES: RoleFormValues = {
	name: null,
	description: null,
}

interface RoleFormDialogProps {
	open: boolean
	mode: 'create' | 'edit'
	role?: RoleDetailRow | null
	permissions: PermissionOption[]
	actorPermissionKeys: string[]
	onOpenChange: (open: boolean) => void
	onSubmit: (
		input: RoleMutationInput,
	) => Promise<{ error?: string } | { success: true }>
}

export function RoleFormDialog({
	open,
	mode,
	role,
	permissions,
	actorPermissionKeys,
	onOpenChange,
	onSubmit,
}: RoleFormDialogProps) {
	const [values, setValues] = useState<RoleFormValues>(INITIAL_VALUES)
	const [selectedPermissionIds, setSelectedPermissionIds] = useState<
		string[]
	>([])
	const [isPending, startTransition] = useTransition()
	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const ungrantablePermissionIds = useMemo(() => {
		const currentRoleIds = new Set(role?.permissionIds ?? [])
		const currentRoleKeys = permissions
			.filter((permission) => currentRoleIds.has(permission.id))
			.map((permission) => permission.key)

		return new Set(
			permissions
				.filter(
					(permission) =>
						!canGrantPermissionKeys({
							actorPermissionKeys,
							requestedPermissionKeys: [permission.key],
							alreadyGrantedPermissionKeys: currentRoleKeys,
						}),
				)
				.map((permission) => permission.id),
		)
	}, [actorPermissionKeys, permissions, role])

	useEffect(() => {
		if (!open) {
			setValues(INITIAL_VALUES)
			setSelectedPermissionIds([])
			reset()
			return
		}

		if (!role) {
			setValues(INITIAL_VALUES)
			setSelectedPermissionIds([])
			return
		}

		setValues({
			name: role.name,
			description: role.description,
		})
		setSelectedPermissionIds(role.permissionIds)
	}, [open, reset, role])

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })
		if (selectedPermissionIds.length === 0) {
			sileo.error({
				title: 'Faltan permisos',
				description: 'Selecciona al menos un permiso para el rol.',
			})
			return
		}

		if (errors.length > 0) return

		const payload: RoleMutationInput = {
			name: values.name ?? '',
			description: values.description ?? null,
			permissionIds: selectedPermissionIds,
		}
		const normalized = normalizeRoleMutationInput(payload)
		const validationError = validateRoleMutationInput(normalized)
		if (validationError) {
			sileo.error({
				title:
					mode === 'create'
						? 'Error al crear rol'
						: 'Error al actualizar rol',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await onSubmit(payload)
			if ('error' in result) {
				sileo.error({
					title:
						mode === 'create'
							? 'Error al crear rol'
							: 'Error al actualizar rol',
					description: result.error,
				})
				return
			}

			sileo.success({
				title: mode === 'create' ? 'Rol creado' : 'Rol actualizado',
			})
			onOpenChange(false)
		})
	}

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			setValues(INITIAL_VALUES)
			setSelectedPermissionIds([])
			reset()
		}
		onOpenChange(nextOpen)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-3xl'>
				<DialogHeader>
					<DialogTitle>
						{mode === 'create' ? 'Nuevo rol' : 'Editar rol'}
					</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<div className='grid gap-4 sm:grid-cols-2'>
						<TextField
							{...register('name')}
							label='Nombre del rol'
							placeholder='Atención al cliente'
							validate={(value) => {
								if (!value?.trim())
									return 'El nombre del rol es requerido.'
								if (value.trim().length < 3) {
									return 'El nombre del rol debe tener al menos 3 caracteres.'
								}
								return null
							}}
							disabled={isPending}
						/>
						<TextField
							{...register('description')}
							label='Descripción'
							placeholder='Acceso operativo para responder reclamos'
							emptyAsNull
							disabled={isPending}
						/>
					</div>

					{ungrantablePermissionIds.size > 0 && (
						<div className='flex items-start gap-2 rounded-xl border border-dashed bg-muted/25 p-3 text-sm text-muted-foreground'>
							<Info className='mt-0.5 size-4 shrink-0' />
							<p>
								Los permisos deshabilitados no forman parte de
								tu acceso, por lo que no puedes asignarlos. Si
								quitas un permiso que no posees y guardas, no
								podrás volver a agregarlo.
							</p>
						</div>
					)}

					<RolePermissionSelector
						permissions={permissions}
						value={selectedPermissionIds}
						onChange={setSelectedPermissionIds}
						disabled={isPending}
						disabledPermissionIds={ungrantablePermissionIds}
					/>
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
						onClick={handleSubmit}
						disabled={isPending}
					>
						{isPending
							? 'Guardando...'
							: mode === 'create'
								? 'Crear rol'
								: 'Guardar cambios'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
