'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { STORE_TYPE_FILTER_OPTIONS } from '@/lib/constants'
import { feedback } from '@/lib/feedback'
import { formatDateDisplay } from '@/lib/formatters'
import {
	$deactivateStoreAction,
	$getStoresTableAction,
} from '@/modules/stores/actions'
import {
	DEFAULT_STORES_TABLE_FILTERS,
	type StoresTableFilters,
} from '@/modules/stores/validation'
import { CreateStoreDialog } from './create-store-dialog'
import { EditStoreDialog } from './edit-store-dialog'
import type { StoreRow, StoresPageProps } from './types'

const STORE_TYPE_LABEL: Record<string, string> = {
	physical: 'Física',
	virtual: 'Virtual',
}

const STORE_STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'active', label: 'Activas' },
	{ value: 'inactive', label: 'Inactivas' },
]

export const StoresPage: FC<StoresPageProps> = ({ initialState }) => {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<StoresTableFilters>(
		initialState.filters,
	)
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)
	const [editingStore, setEditingStore] = useState<StoreRow | null>(null)
	const [isDeactivating, startDeactivateTransition] = useTransition()

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
			const result = await $getStoresTableAction({
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
	}, [initialState.totalItems, setTotalItems, setIsLoading])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `search` se recalcula en cada render por diseño del hook.
	useEffect(() => {
		// Mantiene la tabla sincronizada cuando cambia la paginación.
		void search()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(() => {
		return (
			filters.name.trim() !== '' ||
			filters.type !== DEFAULT_STORES_TABLE_FILTERS.type ||
			filters.status !== DEFAULT_STORES_TABLE_FILTERS.status
		)
	}, [filters])

	const selectedTypeFilter =
		STORE_TYPE_FILTER_OPTIONS.find(
			(option) => option.value === filters.type,
		) ?? STORE_TYPE_FILTER_OPTIONS[0]

	const selectedStatusFilter =
		STORE_STATUS_FILTER_OPTIONS.find(
			(option) => option.value === filters.status,
		) ?? STORE_STATUS_FILTER_OPTIONS[0]

	const handleSearch = () => {
		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const handleNameFilterKeyDown: React.KeyboardEventHandler<
		HTMLInputElement
	> = (event) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setFilters(DEFAULT_STORES_TABLE_FILTERS)

		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const handleCreated = () => {
		setCreateDialogOpen(false)

		// Luego de crear, llevamos al inicio para mostrar el nuevo registro.
		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const handleUpdated = () => {
		setEditingStore(null)
		void search()
	}

	const handleDeactivate = (store: StoreRow) => {
		if (store.deletedAt) return

		feedback
			.confirm({
				title: 'Desactivar tienda',
				description: `Se desactivará "${store.name}". Esta acción no se puede deshacer.`,
				confirmText: 'Desactivar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) return

				startDeactivateTransition(async () => {
					const result = await $deactivateStoreAction(store.id)
					if ('error' in result) {
						sileo.error({
							title: 'Error al desactivar tienda',
							description: result.error,
						})
						return
					}

					sileo.success({ title: 'Tienda desactivada' })
					void search()
				})
			})
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Nombre' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.name}</p>
					<p className='text-xs text-muted-foreground'>{row.slug}</p>
				</div>
			),
		},
		{
			header: { render: () => 'Tipo' },
			cell: ({ row }) => STORE_TYPE_LABEL[row.type] ?? row.type,
		},
		{
			header: { render: () => 'Estado' },
			cell: ({ row }) => (
				<Badge variant={row.deletedAt ? 'secondary' : 'default'}>
					{row.deletedAt ? 'Inactiva' : 'Activa'}
				</Badge>
			),
		},
		{
			header: { render: () => 'Actualización' },
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
						title='Editar tienda'
						disabled={Boolean(row.deletedAt) || isDeactivating}
						onClick={(event) => {
							event.stopPropagation()
							setEditingStore(row)
						}}
					>
						<Pencil />
						<span className='sr-only'>Editar tienda</span>
					</Button>
					<Button
						type='button'
						variant='destructive'
						size='icon-sm'
						title='Desactivar tienda'
						disabled={Boolean(row.deletedAt) || isDeactivating}
						onClick={(event) => {
							event.stopPropagation()
							handleDeactivate(row)
						}}
					>
						<Trash2 />
						<span className='sr-only'>Desactivar tienda</span>
					</Button>
				</div>
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>Tiendas</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Gestiona las sucursales de tu organización.
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<Plus />
					Nueva tienda
				</Button>
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='space-y-4 border-b px-4 py-3'>
					<p className='text-sm text-muted-foreground'>
						{controller.store.totalItems}{' '}
						{controller.store.totalItems === 1
							? 'tienda'
							: 'tiendas'}
					</p>

					<TableFiltersBar
						primaryFilters={[
							<TextField
								key='name-filter'
								label='Nombre'
								placeholder='Buscar por nombre...'
								value={filters.name}
								onKeyDown={handleNameFilterKeyDown}
								onValueChange={(value) => {
									setFilters((previous) => ({
										...previous,
										name: value ?? '',
									}))
								}}
							/>,
							<SelectField
								key='type-filter'
								label='Tipo'
								options={STORE_TYPE_FILTER_OPTIONS}
								value={selectedTypeFilter}
								onValueChange={(value) => {
									setFilters((previous) => ({
										...previous,
										type: (value?.value ??
											DEFAULT_STORES_TABLE_FILTERS.type) as StoresTableFilters['type'],
									}))
								}}
							/>,
							<SelectField
								key='status-filter'
								label='Estado'
								options={STORE_STATUS_FILTER_OPTIONS}
								value={selectedStatusFilter}
								onValueChange={(value) => {
									setFilters((previous) => ({
										...previous,
										status: (value?.value ??
											DEFAULT_STORES_TABLE_FILTERS.status) as StoresTableFilters['status'],
									}))
								}}
							/>,
						]}
						onSearch={handleSearch}
						onClear={handleClear}
						hasActiveFilters={hasActiveFilters}
					/>
				</div>

				<div className='p-4'>
					<DataTable
						controller={controller}
						columns={columns}
						rows={rows}
					/>
				</div>
			</div>

			<CreateStoreDialog
				open={isCreateDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleCreated}
			/>

			<EditStoreDialog
				store={editingStore}
				onClose={() => setEditingStore(null)}
				onSuccess={handleUpdated}
			/>
		</div>
	)
}
