'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
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
	$deletePermissionAction,
	$getPermissionsTableAction,
} from '@/modules/permissions/actions'
import {
	DEFAULT_PERMISSIONS_TABLE_FILTERS,
	type PermissionsTableFilters,
} from '@/modules/permissions/validation'
import { CreatePermissionDialog } from './create-permission-dialog'
import { EditPermissionDialog } from './edit-permission-dialog'
import type { PermissionRow, PermissionsPageProps } from './types'

const SCOPE_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'system', label: 'Base' },
	{ value: 'custom', label: 'Personalizados' },
]

export function PermissionsPage({ initialState }: PermissionsPageProps) {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<PermissionsTableFilters>(
		initialState.filters,
	)
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)
	const [editingPermission, setEditingPermission] =
		useState<PermissionRow | null>(null)
	const [isDeleting, startDeleteTransition] = useTransition()

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
			const result = await $getPermissionsTableAction({
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
			filters.search !== DEFAULT_PERMISSIONS_TABLE_FILTERS.search ||
			filters.module !== DEFAULT_PERMISSIONS_TABLE_FILTERS.module ||
			filters.scope !== DEFAULT_PERMISSIONS_TABLE_FILTERS.scope
		)
	}, [filters])

	const moduleOptions: SelectOption[] = [
		{ value: 'all', label: 'Todos los módulos' },
		...initialState.moduleOptions.map((module) => ({
			value: module,
			label: module,
		})),
	]

	const handleSearch = () => {
		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const handleClear = () => {
		setFilters(DEFAULT_PERMISSIONS_TABLE_FILTERS)
		if (page !== 1) {
			setPage(1)
			return
		}
		void search()
	}

	const handleDelete = (permission: PermissionRow) => {
		if (permission.isSystem) return

		feedback
			.confirm({
				title: 'Eliminar permiso',
				description: `Se eliminará "${permission.name}". Esta acción no se puede deshacer.`,
				confirmText: 'Eliminar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) return

				startDeleteTransition(async () => {
					const result = await $deletePermissionAction(permission.id)
					if ('error' in result) {
						sileo.error({
							title: 'Error al eliminar permiso',
							description: result.error,
						})
						return
					}

					sileo.success({ title: 'Permiso eliminado' })
					void search()
				})
			})
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Permiso' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.name}</p>
					<p className='text-xs text-muted-foreground'>{row.key}</p>
				</div>
			),
		},
		{
			header: { render: () => 'Módulo' },
			cell: ({ row }) => row.module,
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
			header: { render: () => 'Roles' },
			cell: ({ row }) => row.assignedRolesCount,
		},
		{
			header: { render: () => 'Creado' },
			cell: ({ row }) => formatDateDisplay(row.createdAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<div className='flex items-center gap-1'>
					<Button
						type='button'
						variant='ghost'
						size='icon-sm'
						title='Editar permiso'
						disabled={row.isSystem || isDeleting}
						onClick={(event) => {
							event.stopPropagation()
							setEditingPermission(row)
						}}
					>
						<Pencil />
						<span className='sr-only'>Editar permiso</span>
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon-sm'
						title='Eliminar permiso'
						disabled={row.isSystem || isDeleting}
						onClick={(event) => {
							event.stopPropagation()
							handleDelete(row)
						}}
					>
						<Trash2 />
						<span className='sr-only'>Eliminar permiso</span>
					</Button>
				</div>
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>Permisos</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Consulta los permisos base y define permisos
						personalizados para tu organización.
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<Plus />
					Nuevo permiso
				</Button>
			</div>

			<TableFiltersBar
				primaryFilters={[
					<TextField
						key='search'
						label='Buscar'
						placeholder='Nombre o clave del permiso'
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
						key='module'
						label='Módulo'
						options={moduleOptions}
						value={
							moduleOptions.find(
								(option) => option.value === filters.module,
							) ?? moduleOptions[0]
						}
						onValueChange={(value) =>
							setFilters((previous) => ({
								...previous,
								module: value?.value ?? 'all',
							}))
						}
					/>,
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
									(value?.value as PermissionsTableFilters['scope']) ??
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

			<CreatePermissionDialog
				open={isCreateDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={() => {
					setCreateDialogOpen(false)
					void search()
				}}
			/>

			<EditPermissionDialog
				permission={editingPermission}
				onClose={() => setEditingPermission(null)}
				onSuccess={() => {
					setEditingPermission(null)
					void search()
				}}
			/>
		</div>
	)
}
