'use client'

import { Check } from 'lucide-react'
import type { FC } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { PermissionOption } from '@/modules/rbac/queries'

interface RolePermissionSelectorProps {
	permissions: PermissionOption[]
	value: string[]
	onChange: (permissionIds: string[]) => void
	disabled?: boolean
}

interface PermissionGroup {
	module: string
	items: PermissionOption[]
}

const formatModuleLabel = (module: string) => {
	return module
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

export const RolePermissionSelector: FC<RolePermissionSelectorProps> = ({
	permissions,
	value,
	onChange,
	disabled,
}) => {
	const groups = permissions.reduce<PermissionGroup[]>((acc, permission) => {
		const current = acc.find((group) => group.module === permission.module)
		if (current) {
			current.items.push(permission)
			return acc
		}

		acc.push({
			module: permission.module,
			items: [permission],
		})
		return acc
	}, [])

	const togglePermission = (permissionId: string) => {
		if (value.includes(permissionId)) {
			onChange(value.filter((current) => current !== permissionId))
			return
		}

		onChange([...value, permissionId])
	}

	const clearAll = () => {
		onChange([])
	}

	const selectModule = (permissionIds: string[]) => {
		const nextIds = new Set(value)
		const allSelected = permissionIds.every((id) => nextIds.has(id))

		if (allSelected) {
			permissionIds.forEach((id) => {
				nextIds.delete(id)
			})
		} else {
			permissionIds.forEach((id) => {
				nextIds.add(id)
			})
		}

		onChange(Array.from(nextIds))
	}

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between gap-3'>
				<div>
					<p className='text-sm font-medium'>Permisos asignados</p>
					<p className='text-xs text-muted-foreground'>
						Selecciona los accesos que tendrá este rol.
					</p>
				</div>
				<div className='flex items-center gap-2'>
					<Badge variant='secondary'>
						{value.length} seleccionados
					</Badge>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={clearAll}
						disabled={disabled || value.length === 0}
					>
						Limpiar
					</Button>
				</div>
			</div>

			<ScrollArea className='h-150 max-w-full rounded-xl border'>
				<div className='space-y-4 p-4'>
					{groups.map((group) => {
						const permissionIds = group.items.map((item) => item.id)
						const isSelected = permissionIds.every((id) =>
							value.includes(id),
						)

						return (
							<div
								key={group.module}
								className='rounded-xl border bg-background/50 p-4'
							>
								<div className='mb-3 flex items-center justify-between gap-3'>
									<div>
										<h4 className='font-medium'>
											{formatModuleLabel(group.module)}
										</h4>
										<p className='text-xs text-muted-foreground'>
											{group.items.length}{' '}
											{group.items.length === 1
												? 'permiso'
												: 'permisos'}
										</p>
									</div>
									<Button
										type='button'
										variant='outline'
										size='sm'
										onClick={() =>
											selectModule(permissionIds)
										}
										disabled={disabled}
									>
										{isSelected ? (
											<>
												<Check />
												Desmarcar
											</>
										) : (
											<>
												<Check />
												Marcar grupo
											</>
										)}
									</Button>
								</div>

								<div className='grid gap-3 sm:grid-cols-2'>
									{group.items.map((permission) => {
										const checked = value.includes(
											permission.id,
										)

										return (
											<div
												key={permission.id}
												className={cn(
													'flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors',
													checked
														? 'border-primary/40 bg-primary/5'
														: 'hover:bg-muted/40',
												)}
											>
												<Checkbox
													checked={checked}
													onCheckedChange={() =>
														togglePermission(
															permission.id,
														)
													}
													disabled={disabled}
													className='mt-0.5'
												/>
												<div className='min-w-0 space-y-0.5'>
													<div className='flex items-center gap-2'>
														<span className='text-sm font-medium'>
															{permission.name}
														</span>
														{permission.isSystem && (
															<Badge variant='outline'>
																Base
															</Badge>
														)}
													</div>
													<p className='truncate text-xs text-muted-foreground'>
														{permission.key}
													</p>
												</div>
											</div>
										)
									})}
								</div>
							</div>
						)
					})}
				</div>
			</ScrollArea>
		</div>
	)
}
