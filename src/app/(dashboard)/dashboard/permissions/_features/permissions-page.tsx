'use client'

import { useEffect, useMemo, useState } from 'react'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { useDataTable } from '@/hooks/use-data-table'
import { formatDateDisplay } from '@/lib/formatters'
import { $getPermissionsTableAction } from '@/modules/permissions/actions'
import {
	DEFAULT_PERMISSIONS_TABLE_FILTERS,
	type PermissionsTableFilters,
} from '@/modules/permissions/validation'
import type { PermissionsPageProps } from './types'

export function PermissionsPage({ initialState }: PermissionsPageProps) {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<PermissionsTableFilters>(
		initialState.filters,
	)

	const {
		controller,
		defineColumns,
		search,
		autoSearch,
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
		hasInitialData: true,
	})

	useEffect(() => {
		setTotalItems(initialState.totalItems)
		setIsLoading(false)
	}, [initialState.totalItems, setIsLoading, setTotalItems])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `search` cambia por diseño del hook.
	useEffect(() => {
		autoSearch()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(() => {
		return (
			filters.search !== DEFAULT_PERMISSIONS_TABLE_FILTERS.search ||
			filters.module !== DEFAULT_PERMISSIONS_TABLE_FILTERS.module
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
		// Consultar con los filtros por defecto sin esperar el re-render
		void search(DEFAULT_PERMISSIONS_TABLE_FILTERS)
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
			header: { render: () => 'Roles' },
			cell: ({ row }) => row.assignedRolesCount,
		},
		{
			header: { render: () => 'Creado' },
			cell: ({ row }) => formatDateDisplay(row.createdAt),
		},
	])

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Permisos</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Consulta los permisos disponibles para asignar a los roles
					de tu organización.
				</p>
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
		</div>
	)
}
