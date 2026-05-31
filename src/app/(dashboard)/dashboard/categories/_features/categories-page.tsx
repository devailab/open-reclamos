'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { type FC, useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/components/data-table'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Button } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { feedback } from '@/lib/feedback'
import { formatDateDisplay } from '@/lib/formatters'
import {
	$deleteCategoryAction,
	$getCategoriesTableAction,
} from '@/modules/categories/actions'
import { DEFAULT_CATEGORIES_TABLE_FILTERS } from '@/modules/categories/validation'
import { CategoryFormDialog } from './category-form-dialog'
import type { CategoriesPageProps, CategoryRow } from './types'

export const CategoriesPage: FC<CategoriesPageProps> = ({ initialState }) => {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState(initialState.filters)
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(
		null,
	)
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
			const result = await $getCategoriesTableAction({
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
		void search()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(
		() => filters.search.trim() !== DEFAULT_CATEGORIES_TABLE_FILTERS.search,
		[filters],
	)

	const handleSearch = () => {
		if (page !== 1) {
			setPage(1)
			return
		}

		void search()
	}

	const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
		event,
	) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setFilters(DEFAULT_CATEGORIES_TABLE_FILTERS)
		if (page !== 1) {
			setPage(1)
			return
		}
		void search()
	}

	const handleSaved = () => {
		setEditingCategory(null)
		setCreateDialogOpen(false)
		if (page !== 1) {
			setPage(1)
			return
		}
		void search()
	}

	const handleDelete = (category: CategoryRow) => {
		feedback
			.confirm({
				title: 'Eliminar categoría',
				description: `Se eliminará "${category.name}". Los reclamos que la usen quedarán sin categoría.`,
				confirmText: 'Eliminar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) return

				startDeleteTransition(async () => {
					const result = await $deleteCategoryAction(category.id)
					if ('error' in result) {
						sileo.error({
							title: 'Error al eliminar categoría',
							description: result.error,
						})
						return
					}

					sileo.success({ title: 'Categoría eliminada' })
					void search()
				})
			})
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Categoría' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.name}</p>
					{row.description && (
						<p className='text-xs text-muted-foreground line-clamp-2'>
							{row.description}
						</p>
					)}
				</div>
			),
		},
		{
			header: { render: () => 'Actualización' },
			cell: ({ row }) =>
				formatDateDisplay(row.updatedAt ?? row.createdAt),
		},
		{
			header: { render: () => '' },
			cell: ({ row }) => (
				<div className='flex justify-end gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setEditingCategory(row)}
					>
						<Pencil className='size-4' />
						Editar
					</Button>
					<Button
						variant='destructive'
						size='sm'
						disabled={isDeleting}
						onClick={() => handleDelete(row)}
					>
						<Trash2 className='size-4' />
						Eliminar
					</Button>
				</div>
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>
						Categorías de reclamos
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Define las categorías que los usuarios pueden asignar a
						sus reclamos para facilitar su organización y gestión.
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<Plus className='size-4' />
					Nueva categoría
				</Button>
			</div>

			<TableFiltersBar
				hasActiveFilters={hasActiveFilters}
				onSearch={handleSearch}
				onClear={handleClear}
				primaryFilters={[
					<TextField
						key='search'
						label='Buscar'
						placeholder='Buscar por nombre'
						value={filters.search}
						onValueChange={(value) =>
							setFilters((prev) => ({
								...prev,
								search: value ?? '',
							}))
						}
						onKeyDown={handleSearchKeyDown}
					/>,
				]}
			/>

			<DataTable controller={controller} columns={columns} rows={rows} />

			<CategoryFormDialog
				open={isCreateDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleSaved}
			/>
			<CategoryFormDialog
				open={Boolean(editingCategory)}
				onOpenChange={(open) => !open && setEditingCategory(null)}
				category={editingCategory}
				onSuccess={handleSaved}
			/>
		</div>
	)
}
