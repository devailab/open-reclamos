'use client'

import { Check } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type {
	PermissionOption,
	RoleOptionWithPermissions,
	StoreOption,
} from '@/modules/rbac/queries'
import { $updateMemberAccessAction } from '@/modules/users/actions'
import {
	normalizeUpdateUserAccessInput,
	type UserStoreAccessMode,
	validateUpdateUserAccessInput,
} from '@/modules/users/validation'
import type { UserRow } from './types'

interface EditUserDialogProps {
	user: UserRow | null
	onClose: () => void
	onSuccess: () => void
	roles: RoleOptionWithPermissions[]
	permissions: PermissionOption[]
	stores: StoreOption[]
}

const STORE_ACCESS_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todas las tiendas' },
	{ value: 'selected', label: 'Solo algunas tiendas' },
]

// --- Sub-components ---

interface PermissionItemProps {
	permission: PermissionOption
	checked: boolean
	fromRole: boolean
	disabled: boolean
	onToggle: () => void
}

function PermissionItem({
	permission,
	checked,
	fromRole,
	disabled,
	onToggle,
}: PermissionItemProps) {
	return (
		<div
			className={cn(
				'flex items-start gap-2 rounded-lg border px-3 py-2',
				(checked || fromRole) && 'border-primary/40 bg-primary/5',
				fromRole && 'opacity-75',
			)}
		>
			<Checkbox
				checked={checked || fromRole}
				onCheckedChange={fromRole ? undefined : onToggle}
				disabled={disabled || fromRole}
			/>
			<div className='flex-1 space-y-0.5'>
				<div className='flex flex-wrap items-center gap-2'>
					<Label
						className={cn(
							'cursor-pointer',
							(disabled || fromRole) && 'cursor-default',
						)}
						onClick={fromRole || disabled ? undefined : onToggle}
					>
						{permission.name}
					</Label>
					{fromRole && (
						<Badge
							variant='secondary'
							className='text-xs text-green-700'
						>
							<Check />
							Asignado por rol
						</Badge>
					)}
				</div>
				{permission.description && (
					<p className='text-xs text-muted-foreground'>
						{permission.description}
					</p>
				)}
			</div>
		</div>
	)
}

interface PermissionGroupProps {
	module: string
	items: PermissionOption[]
	rolePermissionIds: Set<string>
	selectedPermissionIds: string[]
	disabled: boolean
	onToggle: (id: string) => void
}

function PermissionGroup({
	module,
	items,
	rolePermissionIds,
	selectedPermissionIds,
	disabled,
	onToggle,
}: PermissionGroupProps) {
	return (
		<div className='space-y-2'>
			<p className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>
				{module}
			</p>
			<div className='space-y-2'>
				{items.map((permission) => (
					<PermissionItem
						key={permission.id}
						permission={permission}
						checked={selectedPermissionIds.includes(permission.id)}
						fromRole={rolePermissionIds.has(permission.id)}
						disabled={disabled}
						onToggle={() => onToggle(permission.id)}
					/>
				))}
			</div>
		</div>
	)
}

// --- Main dialog ---

export function EditUserDialog({
	user,
	onClose,
	onSuccess,
	roles,
	permissions,
	stores,
}: EditUserDialogProps) {
	const open = user !== null
	const [role, setRole] = useState<SelectOption | null>(null)
	const [storeAccessMode, setStoreAccessMode] = useState<SelectOption | null>(
		STORE_ACCESS_OPTIONS[0] ?? null,
	)
	const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
	const [selectedPermissionIds, setSelectedPermissionIds] = useState<
		string[]
	>([])
	const [isPending, startTransition] = useTransition()

	const roleOptions = useMemo<SelectOption[]>(
		() =>
			roles.map((r) => ({
				value: r.id,
				label: r.name,
			})),
		[roles],
	)

	const rolePermissionIds = useMemo(() => {
		const selected = roles.find((r) => r.id === role?.value)
		return new Set(selected?.permissionIds ?? [])
	}, [roles, role])

	const groupedPermissions = useMemo(() => {
		const groups = new Map<string, PermissionOption[]>()
		for (const permission of permissions) {
			const current = groups.get(permission.module) ?? []
			current.push(permission)
			groups.set(permission.module, current)
		}
		return Array.from(groups.entries()).map(([module, items]) => ({
			module,
			items,
		}))
	}, [permissions])

	useEffect(() => {
		if (!user) {
			setRole(null)
			setStoreAccessMode(STORE_ACCESS_OPTIONS[0] ?? null)
			setSelectedStoreIds([])
			setSelectedPermissionIds([])
			return
		}

		setRole(
			roleOptions.find((option) => option.value === user.roleId) ?? null,
		)
		setStoreAccessMode(
			STORE_ACCESS_OPTIONS.find(
				(option) => option.value === user.storeAccessMode,
			) ??
				STORE_ACCESS_OPTIONS[0] ??
				null,
		)
		setSelectedStoreIds(user.storeIds)
		setSelectedPermissionIds(user.permissionIds)
	}, [roleOptions, user])

	const toggleStore = (storeId: string) => {
		setSelectedStoreIds((current) =>
			current.includes(storeId)
				? current.filter((value) => value !== storeId)
				: [...current, storeId],
		)
	}

	const togglePermission = (permissionId: string) => {
		setSelectedPermissionIds((current) =>
			current.includes(permissionId)
				? current.filter((value) => value !== permissionId)
				: [...current, permissionId],
		)
	}

	const handleSubmit = () => {
		if (!user) return

		const payload = normalizeUpdateUserAccessInput({
			userId: user.userId,
			roleId: role?.value ?? '',
			storeAccessMode:
				(storeAccessMode?.value as UserStoreAccessMode | undefined) ??
				'all',
			storeIds: selectedStoreIds,
			permissionIds: selectedPermissionIds,
		})

		const validationError = validateUpdateUserAccessInput(payload)
		if (validationError) {
			sileo.error({
				title: 'Error al actualizar usuario',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $updateMemberAccessAction(user.userId, {
				roleId: payload.roleId,
				storeAccessMode: payload.storeAccessMode,
				storeIds: payload.storeIds,
				permissionIds: payload.permissionIds,
			})
			if ('error' in result) {
				sileo.error({
					title: 'Error al actualizar usuario',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Usuario actualizado' })
			onSuccess()
		})
	}

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className='flex max-h-[90vh] flex-col sm:max-w-3xl'>
				<DialogHeader>
					<DialogTitle>Editar acceso del usuario</DialogTitle>
				</DialogHeader>

				{user && (
					<div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
						<div className='rounded-xl border bg-muted/30 p-4'>
							<p className='text-sm font-medium'>{user.name}</p>
							<p className='text-sm text-muted-foreground'>
								{user.email}
							</p>
							<div className='mt-3 flex flex-wrap gap-2'>
								<Badge variant='outline'>
									{user.storeAccessMode === 'all'
										? 'Todas las tiendas'
										: `${user.selectedStoresCount} tienda(s)`}
								</Badge>
								<Badge variant='outline'>
									{user.permissionCount} permiso(s) extra
								</Badge>
							</div>
						</div>

						<div className='grid gap-4 sm:grid-cols-2'>
							<SelectField
								label='Rol'
								placeholder='Selecciona un rol'
								options={roleOptions}
								value={role}
								onValueChange={setRole}
								disabled={isPending}
							/>
							<SelectField
								label='Acceso a tiendas'
								placeholder='Selecciona un alcance'
								options={STORE_ACCESS_OPTIONS}
								value={storeAccessMode}
								onValueChange={setStoreAccessMode}
								disabled={isPending}
							/>
						</div>

						<Separator />

						<div className='space-y-2'>
							<div>
								<p className='text-sm font-medium'>
									Permisos adicionales
								</p>
								<p className='text-sm text-muted-foreground'>
									Estos permisos se suman al rol asignado.
								</p>
							</div>
							<div className='rounded-xl border p-3 space-y-4'>
								{groupedPermissions.map((group) => (
									<PermissionGroup
										key={group.module}
										module={group.module}
										items={group.items}
										rolePermissionIds={rolePermissionIds}
										selectedPermissionIds={
											selectedPermissionIds
										}
										disabled={isPending}
										onToggle={togglePermission}
									/>
								))}
							</div>
						</div>

						{storeAccessMode?.value === 'selected' && (
							<>
								<Separator />
								<div className='space-y-2'>
									<p className='text-sm font-medium'>
										Tiendas permitidas
									</p>
									<ScrollArea className='max-h-56 rounded-xl border p-3'>
										<div className='space-y-3'>
											{stores.map((store) => {
												const checked =
													selectedStoreIds.includes(
														store.id,
													)
												return (
													<div
														key={store.id}
														className={cn(
															'flex items-center gap-2 rounded-lg border px-3 py-2',
															checked &&
																'border-primary/40 bg-primary/5',
														)}
													>
														<Checkbox
															checked={checked}
															onCheckedChange={() =>
																toggleStore(
																	store.id,
																)
															}
															disabled={isPending}
														/>
														<Label
															className='flex-1 cursor-pointer'
															onClick={() =>
																toggleStore(
																	store.id,
																)
															}
														>
															{store.name}
														</Label>
													</div>
												)
											})}
										</div>
									</ScrollArea>
								</div>
							</>
						)}
					</div>
				)}

				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={onClose}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						type='button'
						onClick={handleSubmit}
						disabled={isPending}
					>
						{isPending ? 'Guardando...' : 'Guardar cambios'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
