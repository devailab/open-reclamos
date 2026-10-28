import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
	useFetcher,
	useLoaderData,
	useNavigation,
	useSearchParams,
} from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import DataTable from '@/shared/components/data-table'
import TextField from '@/shared/components/forms/text-field'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Button } from '@/shared/components/ui/button'
import {
	defineDataTableColumns,
	useDataTableController,
} from '@/shared/hooks/use-data-table'
import { feedback } from '@/shared/lib/feedback'
import { formatDateDisplay } from '@/shared/lib/formatters'
import type { action, loader } from '../../pages/categories-page'
import { CategoryFormDialog } from './category-form-dialog'
import type { CategoryRow } from './types'

export function CategoriesPage() {
	const data = useLoaderData<typeof loader>()

	return (
		<CategoriesPageContent
			key={`${data.organizationId}:${data.page}:${data.pageSize}:${data.filters.search}`}
		/>
	)
}

function CategoriesPageContent() {
	const data = useLoaderData<typeof loader>()
	const { session } = useSession()
	const canManage = session?.capabilities?.[PermissionAdmin] === true
	const navigation = useNavigation()
	const deleting = useFetcher<typeof action>()
	const handled = useRef<unknown>(null)
	const [params, setParams] = useSearchParams()
	const [filters, setFilters] = useState(data.filters)
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)

	const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(
		null,
	)

	const isDeleting = deleting.state !== 'idle'
	const rows = data.rows
	const defineColumns = defineDataTableColumns<CategoryRow>

	const updateParams = (patch: Record<string, string>) => {
		setParams((previous) => {
			const next = new URLSearchParams(previous)

			for (const [key, value] of Object.entries(patch)) {
				if (value) {
					next.set(key, value)
				} else {
					next.delete(key)
				}
			}

			return next
		})
	}

	const controller = useDataTableController<CategoryRow>({
		getRowId: (row) => row.id,
		store: {
			page: data.page,
			pageSize: data.pageSize,
			totalItems: data.totalItems,
			isLoading: navigation.state !== 'idle',
			setPage: (page) => updateParams({ page: String(page) }),
			setPageSize: (pageSize) =>
				updateParams({ pageSize: String(pageSize) }),
			setTotalItems: () => {},
			setIsLoading: () => {},
		},
	})

	const hasActiveFilters = params.has('search')

	const handleSearch = () =>
		updateParams({ search: filters.search.trim(), page: '1' })

	const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
		event,
	) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSearch()
		}
	}

	const handleClear = () => updateParams({ search: '', page: '1' })

	const handleSaved = () => {
		setEditingCategory(null)
		setCreateDialogOpen(false)
	}

	useEffect(() => {
		if (
			!deleting.data ||
			deleting.state !== 'idle' ||
			handled.current === deleting.data
		) {
			return
		}

		handled.current = deleting.data

		if ('error' in deleting.data) {
			sileo.error({
				title: 'Error al eliminar categoría',
				description: deleting.data.error,
			})
		} else {
			sileo.success({ title: 'Categoría eliminada' })
		}
	}, [deleting.data, deleting.state])

	const handleDelete = async (category: CategoryRow) => {
		const confirmed = await feedback.confirm({
			title: 'Eliminar categoría',
			description: `Se eliminará "${category.name}". Los reclamos que la usen quedarán sin categoría.`,
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			variant: 'destructive',
		})

		if (confirmed) {
			void deleting.submit(
				{ intent: 'delete', id: category.id },
				{ method: 'post' },
			)
		}
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
						disabled={!canManage}
						onClick={() => setEditingCategory(row)}
					>
						<Pencil className='size-4' />
						Editar
					</Button>
					<Button
						variant='destructive'
						size='sm'
						disabled={!canManage || isDeleting}
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
				<Button
					disabled={!canManage}
					onClick={() => setCreateDialogOpen(true)}
				>
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
