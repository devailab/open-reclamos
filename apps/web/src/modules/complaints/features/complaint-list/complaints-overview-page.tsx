import { CheckCircle2, ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sileo } from 'sileo'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useDataTable } from '@/shared/hooks/use-data-table'
import { cn } from '@/shared/lib/utils'
import { getComplaintsOverview } from '../../api'
import {
	type ComplaintsTableFilters,
	DEFAULT_COMPLAINTS_TABLE_FILTERS,
} from '../../filters'
import { FeaturedComplaintCard } from '../public-book/featured-complaint-card'
import {
	buildComplaintFilterFields,
	countChangedFilters,
} from './advanced-filters'
import type { ComplaintsOverviewPageProps } from './overview-types'

const TYPE_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los tipos' },
	{ value: 'complaint', label: 'Queja' },
	{ value: 'claim', label: 'Reclamo' },
]

const OVERVIEW_DEFAULT_FILTERS: ComplaintsTableFilters = {
	...DEFAULT_COMPLAINTS_TABLE_FILTERS,
	sort: 'featured',
	activeOnly: true,
}

const ADVANCED_FILTER_KEYS: (keyof ComplaintsTableFilters)[] = [
	'priority',
	'status',
	'dateStart',
	'dateEnd',
	'overdue',
	'activeOnly',
]

const getSelectedOption = (options: SelectOption[], value: string) =>
	options.find((option) => option.value === value) ?? options[0]

export const ComplaintsOverviewPage: FC<ComplaintsOverviewPageProps> = ({
	initialState,
	stores,
}) => {
	const lastTotalRef = useRef(initialState.totalItems)
	const [rows, setRows] = useState(initialState.rows)

	const [filters, setFilters] = useState<ComplaintsTableFilters>(
		initialState.filters,
	)

	const {
		controller,
		search,
		autoSearch,
		page,
		pageSize,
		setPage,
		isLoading,
		setIsLoading,
	} = useDataTable({
		getRowId: (row) => row.id,
		setRows,
		fetchData: async ({ page, pageSize, filters }) => {
			try {
				const result = await getComplaintsOverview({
					page,
					pageSize,
					filters,
				})

				lastTotalRef.current = result.totalItems

				return {
					rows: result.rows,
					totalItems: result.totalItems,
					page: result.page,
				}
			} catch (error) {
				sileo.error({
					title: 'No se pudieron cargar los reclamos',
					description:
						error instanceof Error
							? error.message
							: 'Intenta nuevamente.',
				})

				return { rows, totalItems: lastTotalRef.current }
			}
		},
		filters,
		setFilters,
		hasInitialData: true,
		initialPage: initialState.page,
		initialPageSize: initialState.pageSize,
		initialTotalItems: initialState.totalItems,
	})

	useEffect(() => {
		setIsLoading(false)
	}, [setIsLoading])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `autoSearch` se recrea por diseño del hook compartido.
	useEffect(() => {
		autoSearch()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(
		() =>
			JSON.stringify(filters) !==
			JSON.stringify(OVERVIEW_DEFAULT_FILTERS),
		[filters],
	)

	const filterFields = buildComplaintFilterFields({
		filters,
		setFilters,
		stores,
		categories: initialState.categories,
	})

	const handleSearch = (nextFilters = filters) => {
		if (page !== 1) {
			setPage(1)

			return
		}

		void search(nextFilters)
	}

	const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
		event,
	) => {
		if (event.key !== 'Enter') {
			return
		}

		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setFilters(OVERVIEW_DEFAULT_FILTERS)
		handleSearch(OVERVIEW_DEFAULT_FILTERS)
	}

	const totalPages = Math.max(1, controller.totalPages)

	return (
		<div className='space-y-6'>
			<div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold'>
						Vista general de reclamos
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Todos los reclamos pendientes de tus tiendas,
						priorizados para facilitar su atención.
					</p>
				</div>
				<div className='shrink-0 rounded-full border bg-card px-3 py-1.5 text-sm font-medium'>
					{controller.store.totalItems}{' '}
					{controller.store.totalItems === 1
						? 'pendiente'
						: 'pendientes'}
				</div>
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='border-b px-4 py-4'>
					<TableFiltersBar
						primaryFilters={[
							<TextField
								key='search-filter'
								label='Buscar'
								placeholder='Correlativo, nombre...'
								value={filters.search}
								onKeyDown={handleSearchKeyDown}
								onValueChange={(value) =>
									setFilters((current) => ({
										...current,
										search: value ?? '',
									}))
								}
							/>,
							<SelectField
								key='type-filter'
								label='Tipo'
								options={TYPE_FILTER_OPTIONS}
								value={getSelectedOption(
									TYPE_FILTER_OPTIONS,
									filters.type,
								)}
								onValueChange={(value) =>
									setFilters((current) => ({
										...current,
										type: (value?.value ??
											'all') as ComplaintsTableFilters['type'],
									}))
								}
							/>,
							filterFields.store,
							filterFields.category,
							filterFields.sort,
						]}
						advancedFilters={[
							filterFields.priority,
							filterFields.status,
							filterFields.dateStart,
							filterFields.dateEnd,
							filterFields.overdue,
							filterFields.activeOnly,
						]}
						activeAdvancedCount={countChangedFilters(
							filters,
							OVERVIEW_DEFAULT_FILTERS,
							ADVANCED_FILTER_KEYS,
						)}
						onSearch={() => handleSearch()}
						onClear={handleClear}
						hasActiveFilters={hasActiveFilters}
					/>
				</div>

				<div className='relative min-h-64 p-4'>
					<div
						className={cn(
							'absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-background/60 backdrop-blur-sm transition-opacity',
							isLoading && rows.length > 0
								? 'opacity-100'
								: 'pointer-events-none opacity-0',
						)}
					>
						<Spinner className='size-6' />
					</div>

					{isLoading && rows.length === 0 ? (
						<div className='flex min-h-64 items-center justify-center'>
							<Spinner className='size-6' />
						</div>
					) : rows.length > 0 ? (
						<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
							{rows.map((complaint) => (
								<FeaturedComplaintCard
									key={complaint.id}
									complaint={complaint}
								/>
							))}
						</div>
					) : hasActiveFilters ? (
						<div className='flex min-h-64 flex-col items-center justify-center px-4 text-center'>
							<div className='mb-4 flex size-14 items-center justify-center rounded-full bg-muted'>
								<SearchX className='size-7 text-muted-foreground' />
							</div>
							<h2 className='text-base font-semibold'>
								No encontramos coincidencias
							</h2>
							<p className='mt-1 max-w-md text-sm text-muted-foreground'>
								Prueba con otros filtros o limpia la búsqueda
								para ver tus reclamos pendientes.
							</p>
							<Button
								type='button'
								variant='outline'
								className='mt-4'
								onClick={handleClear}
							>
								Limpiar filtros
							</Button>
						</div>
					) : (
						<div className='flex min-h-72 flex-col items-center justify-center px-4 text-center'>
							<div className='mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10'>
								<CheckCircle2 className='size-8 text-emerald-600' />
							</div>
							<h2 className='text-lg font-semibold'>
								¡Todo está al día!
							</h2>
							<p className='mt-1 max-w-md text-sm text-muted-foreground'>
								Felicitaciones, no tienes reclamos pendientes.
							</p>
						</div>
					)}
				</div>

				{rows.length > 0 ? (
					<div className='flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
						<p className='text-sm text-muted-foreground'>
							Página {page} de {totalPages} · Mostrando hasta{' '}
							{pageSize} reclamos por página
						</p>
						<div className='flex items-center gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								disabled={
									!controller.hasPreviousPage || isLoading
								}
								onClick={controller.setPreviousPage}
							>
								<ChevronLeft />
								Anterior
							</Button>
							<Button
								type='button'
								variant='outline'
								size='sm'
								disabled={!controller.hasNextPage || isLoading}
								onClick={controller.setNextPage}
							>
								Siguiente
								<ChevronRight />
							</Button>
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}
