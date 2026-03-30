'use client'

import { endOfDay, startOfDay } from 'date-fns'
import { Eye } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/components/data-table'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
import DateField from '@/components/forms/date-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Button } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { formatDateTimeDisplay } from '@/lib/formatters'
import {
	$getAuditLogsTableAction,
	$searchAuditUsersAction,
} from '@/modules/audit/actions'
import {
	type AuditTableFilters,
	createDefaultAuditTableFilters,
} from '@/modules/audit/validation'
import { AuditLogDetailsDialog } from './audit-log-details-dialog'
import type { AuditLogRow, AuditPageProps } from './types'

export const AuditPage: FC<AuditPageProps> = ({ initialState }) => {
	const [rows, setRows] = useState(initialState.rows)
	const [selectedUser, setSelectedUser] = useState<AutocompleteOption | null>(
		null,
	)
	const [filters, setFilters] = useState<AuditTableFilters>(() => ({
		...initialState.filters,
		createdAtStart: new Date(initialState.filters.createdAtStart),
		createdAtEnd: new Date(initialState.filters.createdAtEnd),
	}))
	const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null)

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
			const result = await $getAuditLogsTableAction({
				page,
				pageSize,
				filters,
			})

			if (result.error) {
				sileo.error({
					title: 'Error al consultar auditoría',
					description: result.error,
				})
			}

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
		void search()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(() => {
		const defaults = createDefaultAuditTableFilters()

		return (
			filters.action.trim() !== '' ||
			filters.entityType.trim() !== '' ||
			filters.entityId.trim() !== '' ||
			filters.userId.trim() !== '' ||
			filters.createdAtStart.getTime() !==
				defaults.createdAtStart.getTime() ||
			filters.createdAtEnd.getTime() !== defaults.createdAtEnd.getTime()
		)
	}, [filters])

	const handleSearch = () => {
		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const handleTextFilterKeyDown: React.KeyboardEventHandler<
		HTMLInputElement
	> = (event) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setSelectedUser(null)
		setFilters(createDefaultAuditTableFilters())

		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Acción' },
			cell: ({ row }) => row.action,
		},
		{
			header: { render: () => 'Tipo de entidad' },
			cell: ({ row }) => row.entityType,
		},
		{
			header: { render: () => 'Fecha' },
			cell: ({ row }) => formatDateTimeDisplay(row.createdAt),
		},
		{
			header: { render: () => 'Usuario' },
			cell: ({ row }) => (
				<div className='flex flex-col'>
					<span className='text-sm font-medium'>{row.userName}</span>
					{row.userEmail !== '—' && (
						<span className='text-xs text-muted-foreground'>
							{row.userEmail}
						</span>
					)}
				</div>
			),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<Button
					type='button'
					variant='ghost'
					size='icon-sm'
					title='Ver detalle del log'
					onClick={(event) => {
						event.stopPropagation()
						setSelectedLog(row)
					}}
				>
					<Eye />
					<span className='sr-only'>Ver detalle del log</span>
				</Button>
			),
		},
	])

	return (
		<>
			<div className='space-y-6'>
				<div>
					<h1 className='text-2xl font-semibold'>Auditoría</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Consulta el historial de acciones registradas en el
						sistema.
					</p>
				</div>

				<div className='rounded-xl border bg-card'>
					<div className='space-y-4 border-b px-4 py-3'>
						<p className='text-sm text-muted-foreground'>
							{controller.store.totalItems}{' '}
							{controller.store.totalItems === 1
								? 'registro'
								: 'registros'}
						</p>

						<TableFiltersBar
							primaryFilters={[
								<TextField
									key='action-filter'
									label='Acción'
									placeholder='Ej. ---'
									value={filters.action}
									onKeyDown={handleTextFilterKeyDown}
									onValueChange={(value) => {
										setFilters((previous) => ({
											...previous,
											action: value ?? '',
										}))
									}}
								/>,
								<TextField
									key='entity-type-filter'
									label='Tipo de entidad'
									placeholder='Ej. ---'
									value={filters.entityType}
									onKeyDown={handleTextFilterKeyDown}
									onValueChange={(value) => {
										setFilters((previous) => ({
											...previous,
											entityType: value ?? '',
										}))
									}}
								/>,
								<TextField
									key='entity-id-filter'
									label='ID de entidad'
									placeholder='ID de entidad'
									value={filters.entityId}
									onKeyDown={handleTextFilterKeyDown}
									onValueChange={(value) => {
										setFilters((previous) => ({
											...previous,
											entityId: value ?? '',
										}))
									}}
								/>,
								<AutocompleteField
									key='user-filter'
									label='Usuario'
									placeholder='Selecciona un usuario'
									searchPlaceholder='Buscar por nombre o correo'
									emptyMessage='No se encontraron usuarios.'
									value={selectedUser}
									onSearch={async (query) => {
										const result =
											await $searchAuditUsersAction(query)

										if (result.error) {
											sileo.error({
												title: 'Error al buscar usuarios',
												description: result.error,
											})
											return []
										}

										return result.options.map((option) => ({
											value: option.value,
											label: option.label,
										}))
									}}
									onValueChange={(value) => {
										setSelectedUser(value ?? null)
										setFilters((previous) => ({
											...previous,
											userId: value?.value ?? '',
										}))
									}}
								/>,
							]}
							advancedFilters={[
								<DateField
									key='created-at-start-filter'
									label='Fecha inicio'
									value={filters.createdAtStart}
									maxDate={filters.createdAtEnd}
									onValueChange={(value) => {
										setFilters((previous) => ({
											...previous,
											createdAtStart: startOfDay(
												value ?? new Date(),
											),
										}))
									}}
								/>,
								<DateField
									key='created-at-end-filter'
									label='Fecha fin'
									value={filters.createdAtEnd}
									minDate={filters.createdAtStart}
									onValueChange={(value) => {
										setFilters((previous) => ({
											...previous,
											createdAtEnd: endOfDay(
												value ?? new Date(),
											),
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
			</div>

			<AuditLogDetailsDialog
				log={selectedLog}
				onClose={() => setSelectedLog(null)}
			/>
		</>
	)
}
