'use client'

import { CheckCircle2, ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useDataTable } from '@/hooks/use-data-table'
import { cn } from '@/lib/utils'
import { FeaturedComplaintCard } from '@/modules/complaints/components/featured-complaint-card'
import { $getComplaintsOverviewAction } from '@/modules/complaints/dashboard-actions'
import {
	type ComplaintsTableFilters,
	DEFAULT_COMPLAINTS_TABLE_FILTERS,
} from '@/modules/complaints/dashboard-validation'
import type { ComplaintsOverviewPageProps } from './overview-types'

const TYPE_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los tipos' },
	{ value: 'complaint', label: 'Queja' },
	{ value: 'claim', label: 'Reclamo' },
]

const SORT_OPTIONS: SelectOption[] = [
	{ value: 'featured', label: 'Destacados primero' },
	{ value: 'newest', label: 'Fecha de llegada' },
	{ value: 'priority', label: 'Mayor prioridad' },
]

const getSelectedOption = (options: SelectOption[], value: string) =>
	options.find((option) => option.value === value) ?? options[0]

export const ComplaintsOverviewPage: FC<ComplaintsOverviewPageProps> = ({
	initialState,
}) => {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<ComplaintsTableFilters>(
		initialState.filters,
	)
	const categoryOptions = useMemo<SelectOption[]>(
		() => [
			{ value: 'all', label: 'Todas las categorías' },
			...initialState.categories.map((category) => ({
				value: category.id,
				label: category.name,
			})),
		],
		[initialState.categories],
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
			const result = await $getComplaintsOverviewAction({
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
			filters.search.trim() !== '' ||
			filters.type !== DEFAULT_COMPLAINTS_TABLE_FILTERS.type ||
			filters.categoryId !==
				DEFAULT_COMPLAINTS_TABLE_FILTERS.categoryId ||
			filters.sort !== 'featured',
		[filters],
	)

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
		if (event.key !== 'Enter') return
		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		const clearedFilters: ComplaintsTableFilters = {
			...DEFAULT_COMPLAINTS_TABLE_FILTERS,
			sort: 'featured',
		}
		setFilters(clearedFilters)
		handleSearch(clearedFilters)
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
						]}
						advancedFilters={[
							<SelectField
								key='category-filter'
								label='Categoría'
								options={categoryOptions}
								value={getSelectedOption(
									categoryOptions,
									filters.categoryId,
								)}
								onValueChange={(value) =>
									setFilters((current) => ({
										...current,
										categoryId: value?.value ?? 'all',
									}))
								}
							/>,
							<SelectField
								key='sort-filter'
								label='Ordenar por'
								options={SORT_OPTIONS}
								value={getSelectedOption(
									SORT_OPTIONS,
									filters.sort,
								)}
								onValueChange={(value) =>
									setFilters((current) => ({
										...current,
										sort: (value?.value ??
											'featured') as ComplaintsTableFilters['sort'],
									}))
								}
							/>,
						]}
						onSearch={() => handleSearch()}
						onClear={handleClear}
						hasActiveFilters={hasActiveFilters}
						advancedFiltersLabel='Más filtros'
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
								Felicitaciones, no tienes reclamos pendientes
								por atender en tus tiendas.
							</p>
						</div>
					)}
				</div>

				{rows.length > 0 ? (
					<div className='flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
						<p className='text-sm text-muted-foreground'>
							Página {page} de {totalPages} · Mostrando hasta 16
							reclamos por página
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
