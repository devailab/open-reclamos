'use client'

import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { feedback } from '@/lib/feedback'
import { formatDateDisplay } from '@/lib/formatters'
import {
	$createRoleAction,
	$deleteRoleAction,
	$getRoleAction,
	$getRolesTableAction,
	$updateRoleAction,
} from '@/modules/roles/actions'
import type { RoleDetailRow } from '@/modules/roles/queries'
import {
	DEFAULT_ROLES_TABLE_FILTERS,
	type RolesTableFilters,
} from '@/modules/roles/validation'
import { RoleFormDialog } from './role-form-dialog'
import type { RoleRow, RolesPageProps } from './types'

const SCOPE_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'system', label: 'Base' },
	{ value: 'custom', label: 'Personalizados' },
]

export function RolesPage({ initialState }: RolesPageProps) {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<RolesTableFilters>(
		initialState.filters,
	)
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)
	const [editingRole, setEditingRole] = useState<RoleDetailRow | null>(null)
	const [isDeleting, startDeleteTransition] = useTransition()
	const [isLoadingRole, startRoleTransition] = useTransition()

	const {
		controller,
		defineColumns,
		search,
		page,
		pageSize,
		setPage,
		setTotalItems,
		setIsLoading,
	} = useDataTable({
		getRowId: (row) => row.id,
		setRows,
		fetchData: async ({ page, pageSize, filters }) => {
			const result = await $getRolesTableAction({
				page,
				pageSize,
				filters,
			})

			return {
				rows: result.rows,
				totalItems: result.totalItems,
				page: result.page,
			}
		},
		filters,
		setFilters,
	})

	useEffect(() => {
		setTotalItems(initialState.totalItems)
		setIsLoading(false)
	}, [initialState.totalItems, setIsLoading, setTotalItems])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `search` cambia por diseño del hook.
	useEffect(() => {
		void search()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(() => {
		return (
			filters.search !== DEFAULT_ROLES_TABLE_FILTERS.search ||
			filters.scope !== DEFAULT_ROLES_TABLE_FILTERS.scope
		)
	}, [filters])

	const handleSearch = () => {
		if (page !== 1) {
			setPage(1)
			return
		}
		void search()
	}

	const handleClear = () => {
		setFilters(DEFAULT_ROLES_TABLE_FILTERS)
		if (page !== 1) {
			setPage(1)
			return
		}
		void search()
	}

	const handleEdit = (role: RoleRow) => {
		if (role.isSystem) return

		startRoleTransition(async () => {
			const result = await $getRoleAction(role.id)
			if ('error' in result) {
				sileo.error({
					title: 'Error al cargar rol',
					description: result.error,
				})
				return
			}

			if (!result.role) return

			setEditingRole({
				...role,
				permissionIds: result.role.permissionIds,
			})
		})
	}

	const handleDelete = (role: RoleRow) => {
		if (role.isSystem) return

		feedback
			.confirm({
				title: 'Eliminar rol',
				description: `Se eliminará "${role.name}". Esta acción no se puede deshacer.`,
				confirmText: 'Eliminar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) return

				startDeleteTransition(async () => {
					const result = await $deleteRoleAction(role.id)
					if ('error' in result) {
						sileo.error({
							title: 'Error al eliminar rol',
							description: result.error,
						})
						return
					}

					sileo.success({ title: 'Rol eliminado' })
					void search()
				})
			})
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Rol' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.name}</p>
					<p className='text-xs text-muted-foreground'>{row.slug}</p>
				</div>
			),
		},
		{
			header: { render: () => 'Tipo' },
			cell: ({ row }) => (
				<Badge variant={row.isSystem ? 'secondary' : 'default'}>
					{row.isSystem ? 'Base' : 'Personalizado'}
				</Badge>
			),
		},
		{
			header: { render: () => 'Permisos' },
			cell: ({ row }) => row.permissionsCount,
		},
		{
			header: { render: () => 'Usuarios' },
			cell: ({ row }) => row.membersCount,
		},
		{
			header: { render: () => 'Actualizado' },
			cell: ({ row }) =>
				formatDateDisplay(row.updatedAt ?? row.createdAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<div className='flex items-center gap-1'>
					<Button
						type='button'
						variant='ghost'
						size='icon-sm'
						title='Editar rol'
						disabled={row.isSystem || isDeleting || isLoadingRole}
						onClick={(event) => {
							event.stopPropagation()
							handleEdit(row)
						}}
					>
						<Pencil />
						<span className='sr-only'>Editar rol</span>
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon-sm'
						title='Eliminar rol'
						disabled={row.isSystem || isDeleting}
						onClick={(event) => {
							event.stopPropagation()
							handleDelete(row)
						}}
					>
						<Trash2 />
						<span className='sr-only'>Eliminar rol</span>
					</Button>
				</div>
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>Roles</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Define perfiles de acceso reutilizables para el equipo
						de tu organización.
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<Plus />
					Nuevo rol
				</Button>
			</div>

			<div className='rounded-xl border border-dashed bg-muted/25 p-4'>
				<div className='flex items-start gap-3'>
					<div className='rounded-lg bg-primary/10 p-2 text-primary'>
						<ShieldCheck className='size-4' />
					</div>
					<div className='space-y-1'>
						<p className='text-sm font-medium'>
							Roles base protegidos
						</p>
						<p className='text-sm text-muted-foreground'>
							Los roles base vienen listos para arrancar y no se
							pueden editar ni eliminar. Crea roles personalizados
							si necesitas una combinación distinta de permisos.
						</p>
					</div>
				</div>
			</div>

			<TableFiltersBar
				primaryFilters={[
					<TextField
						key='search'
						label='Buscar'
						placeholder='Nombre o slug del rol'
						value={filters.search}
						onValueChange={(value) =>
							setFilters((previous) => ({
								...previous,
								search: value ?? '',
							}))
						}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault()
								handleSearch()
							}
						}}
					/>,
				]}
				advancedFilters={[
					<SelectField
						key='scope'
						label='Tipo'
						options={SCOPE_FILTER_OPTIONS}
						value={
							SCOPE_FILTER_OPTIONS.find(
								(option) => option.value === filters.scope,
							) ?? SCOPE_FILTER_OPTIONS[0]
						}
						onValueChange={(value) =>
							setFilters((previous) => ({
								...previous,
								scope:
									(value?.value as RolesTableFilters['scope']) ??
									'all',
							}))
						}
					/>,
				]}
				onSearch={handleSearch}
				onClear={handleClear}
				hasActiveFilters={hasActiveFilters}
			/>

			<div className='rounded-xl border bg-card'>
				<DataTable
					controller={controller}
					columns={columns}
					rows={rows}
				/>
			</div>

			<RoleFormDialog
				open={isCreateDialogOpen}
				mode='create'
				permissions={initialState.permissions}
				onOpenChange={setCreateDialogOpen}
				onSubmit={async (input) => {
					const result = await $createRoleAction(input)
					if ('error' in result) return result
					setCreateDialogOpen(false)
					void search()
					return result
				}}
			/>

			<RoleFormDialog
				open={Boolean(editingRole)}
				mode='edit'
				role={editingRole}
				permissions={initialState.permissions}
				onOpenChange={(open) => {
					if (!open) setEditingRole(null)
				}}
				onSubmit={async (input) => {
					if (!editingRole) return { error: 'No se encontró el rol.' }
					const result = await $updateRoleAction(
						editingRole.id,
						input,
					)
					if ('error' in result) return result
					setEditingRole(null)
					void search()
					return result
				}}
			/>
		</div>
	)
}
