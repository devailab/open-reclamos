import { endOfDay, startOfDay } from 'date-fns'
import { Eye } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/shared/components/data-table'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/shared/components/forms/autocomplete-field'
import DateField from '@/shared/components/forms/date-field'
import TextField from '@/shared/components/forms/text-field'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useDataTable } from '@/shared/hooks/use-data-table'
import { formatDateTimeDisplay } from '@/shared/lib/formatters'
import { getAuditLogs, searchAuditUsers } from '../features/audit/api'
import { AuditLogDetailsDialog } from '../features/audit/audit-log-details-dialog'
import type {
	AuditInitialState,
	AuditLogRow,
	AuditPageProps,
} from '../features/audit/types'
import {
	type AuditTableFilters,
	createDefaultAuditTableFilters,
} from '../features/audit/validation'

const AuditPageView: FC<AuditPageProps> = ({ initialState }) => {
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
		autoSearch,
		page,
		pageSize,
		setPage,
		setTotalItems,
		setIsLoading,
	} = useDataTable({
		getRowId: (row) => row.id,
		setRows,
		fetchData: async ({
			page,
			pageSize,
			filters,
		}): Promise<{
			rows: AuditLogRow[]
			totalItems: number
			page: number
		}> => {
			try {
				const result = await getAuditLogs({
					page,
					pageSize,
					filters,
				})

				return {
					rows: result.rows,
					totalItems: result.totalItems,
					page: result.page,
				}
			} catch (error) {
				sileo.error({
					title: 'Error al consultar',
					description:
						error instanceof Error
							? error.message
							: 'No se pudieron cargar los datos.',
				})

				return { rows, totalItems: controller.store.totalItems, page }
			}
		},
		filters,
		setFilters,
		hasInitialData: true,
		initialPage: initialState.page,
		initialPageSize: initialState.pageSize,
	})

	useEffect(() => {
		setTotalItems(initialState.totalItems)
		setIsLoading(false)
	}, [initialState.totalItems, setTotalItems, setIsLoading])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `search` se recalcula en cada render por diseño del hook.
	useEffect(() => {
		autoSearch()
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

	const activeAdvancedCount = useMemo(() => {
		const defaults = createDefaultAuditTableFilters()

		return [
			filters.createdAtStart.getTime() !==
				defaults.createdAtStart.getTime(),
			filters.createdAtEnd.getTime() !== defaults.createdAtEnd.getTime(),
		].filter(Boolean).length
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
		if (event.key !== 'Enter') {
			return
		}

		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setSelectedUser(null)

		const defaultFilters = createDefaultAuditTableFilters()

		setFilters(defaultFilters)

		if (page !== 1) {
			setPage(1)

			return
		}

		// Consultar con los filtros por defecto sin esperar el re-render
		void search(defaultFilters)
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
											await searchAuditUsers(query)

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
							activeAdvancedCount={activeAdvancedCount}
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

export function AuditPage() {
	const [initialState, setInitialState] = useState<AuditInitialState | null>(
		null,
	)

	const [error, setError] = useState<string | null>(null)
	const [revision, setRevision] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision dispara intencionalmente una nueva carga al pulsar Reintentar.
	useEffect(() => {
		const abort = new AbortController()

		setInitialState(null)
		setError(null)

		const filters = createDefaultAuditTableFilters()

		getAuditLogs({ page: 1, pageSize: 10, filters }, abort.signal)
			.then((table) => ({ ...table, pageSize: 10, filters }))
			.then((state) => {
				if (!abort.signal.aborted) {
					setInitialState(state)
				}
			})
			.catch((error) => {
				if (!abort.signal.aborted) {
					setError(
						error instanceof Error
							? error.message
							: 'No se pudieron cargar los datos.',
					)
				}
			})

		return () => abort.abort()
	}, [revision])

	if (error) {
		return (
			<div role='alert' className='space-y-3'>
				<p>{error}</p>
				<Button
					variant='outline'
					onClick={() => setRevision((value) => value + 1)}
				>
					Reintentar
				</Button>
			</div>
		)
	}

	if (!initialState) {
		return (
			<div className='flex flex-1 items-center justify-center'>
				<Spinner className='size-6' />
			</div>
		)
	}

	return <AuditPageView initialState={initialState} />
}
