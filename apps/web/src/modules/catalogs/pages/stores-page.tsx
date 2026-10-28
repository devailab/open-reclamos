import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { CopyButton } from '@/shared/components/copy-button'
import DataTable from '@/shared/components/data-table'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { STORE_TYPE_FILTER_OPTIONS } from '@/shared/constants/options'
import { useDataTable } from '@/shared/hooks/use-data-table'
import { feedback } from '@/shared/lib/feedback'
import { formatDateDisplay } from '@/shared/lib/formatters'
import {
	deactivateStore,
	getStoresTable,
	setStoreFormEnabled,
} from '../features/stores/api'
import { CreateStoreDialog } from '../features/stores/create-store-dialog'
import { EditStoreDialog } from '../features/stores/edit-store-dialog'
import type { StoreRow } from '../features/stores/types'
import {
	DEFAULT_STORES_TABLE_FILTERS,
	type StoresTableFilters,
} from '../features/stores/validation'

const STORE_TYPE_LABEL: Record<string, string> = {
	physical: 'Física',
	virtual: 'Virtual',
}

const STORE_STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'active', label: 'Activas' },
	{ value: 'inactive', label: 'Inactivas' },
]

export function StoresPage() {
	const { session } = useSession()

	if (!session?.organization_id) {
		return <p role='status'>Selecciona una organización para continuar.</p>
	}

	return <StoresPageContent key={session.organization_id} />
}

function StoresPageContent() {
	const { session } = useSession()
	const canManage = session?.capabilities?.[PermissionAdmin] === true
	const [rows, setRows] = useState([] as StoreRow[])

	const [filters, setFilters] = useState<StoresTableFilters>(
		DEFAULT_STORES_TABLE_FILTERS,
	)

	const [organizationFormEnabled, setOrganizationFormEnabled] = useState(true)
	const totalRef = useRef(0)

	const [loadError, setLoadError] = useState<string | null>(null)
	const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)
	const [editingStore, setEditingStore] = useState<StoreRow | null>(null)
	const [isDeactivating, startDeactivateTransition] = useTransition()
	const [isTogglingForm, startToggleFormTransition] = useTransition()
	const [togglingStoreId, setTogglingStoreId] = useState<string | null>(null)

	const {
		controller,
		defineColumns,
		search,
		autoSearch,
		page,
		pageSize,
		setPage,
	} = useDataTable({
		getRowId: (row) => row.id,
		setRows,
		fetchData: async ({ page, pageSize, filters }) => {
			try {
				setLoadError(null)

				const result = await getStoresTable({
					page,
					pageSize,
					filters,
				})

				setOrganizationFormEnabled(result.organizationFormEnabled)

				totalRef.current = result.totalItems

				return {
					rows: result.rows,
					totalItems: result.totalItems,
					page: result.page,
				}
			} catch (error) {
				setLoadError(
					error instanceof Error
						? error.message
						: 'No se pudo cargar la tabla.',
				)

				return { rows: rows, totalItems: totalRef.current, page }
			}
		},
		filters,
		setFilters,
		hasInitialData: false,
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies: `search` se recalcula en cada render por diseño del hook.
	useEffect(() => {
		// Mantiene la tabla sincronizada cuando cambia la paginación.
		autoSearch()
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
		if (event.key !== 'Enter') {
			return
		}

		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setFilters(DEFAULT_STORES_TABLE_FILTERS)

		if (page !== 1) {
			setPage(1)

			return
		}

		// Consultar con los filtros por defecto sin esperar el re-render
		void search(DEFAULT_STORES_TABLE_FILTERS)
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

	const handleToggleForm = (store: StoreRow, nextValue: boolean) => {
		if (store.deletedAt) {
			return
		}

		setTogglingStoreId(store.id)

		startToggleFormTransition(async () => {
			const result = await setStoreFormEnabled(store.id, nextValue)

			setTogglingStoreId(null)

			if ('error' in result) {
				sileo.error({
					title: 'Error al actualizar formulario',
					description: result.error,
				})

				return
			}

			sileo.success({
				title: nextValue
					? 'Formulario habilitado'
					: 'Formulario deshabilitado',
			})

			void search()
		})
	}

	const handleDeactivate = (store: StoreRow) => {
		if (store.deletedAt) {
			return
		}

		feedback
			.confirm({
				title: 'Desactivar tienda',
				description: `Se desactivará "${store.name}". Esta acción no se puede deshacer.`,
				confirmText: 'Desactivar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) {
					return
				}

				startDeactivateTransition(async () => {
					const result = await deactivateStore(store.id)

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
				<div className='flex items-center gap-2.5'>
					<span
						className='size-3.5 shrink-0 rounded-full ring-1 ring-black/10'
						style={{ backgroundColor: row.color }}
					/>
					<div className='space-y-0.5'>
						<p className='text-sm font-medium'>{row.name}</p>
						<p className='text-xs text-muted-foreground'>
							{row.slug}
						</p>
					</div>
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
			header: { render: () => 'Formulario' },
			cell: ({ row }) => {
				const path = `/s/${row.slug}`

				const fullUrl =
					typeof window !== 'undefined'
						? `${window.location.origin}${path}`
						: path

				const isTogglePending =
					isTogglingForm && togglingStoreId === row.id

				const isPubliclyBlocked =
					Boolean(row.deletedAt) ||
					!row.formEnabled ||
					!organizationFormEnabled

				return (
					<div className='space-y-2'>
						{!organizationFormEnabled && !row.deletedAt && (
							<Badge variant='secondary'>
								Bloqueado globalmente
							</Badge>
						)}
						<div className='flex items-center gap-3'>
							<Switch
								checked={row.formEnabled}
								disabled={
									!canManage ||
									Boolean(row.deletedAt) ||
									isTogglePending
								}
								onClick={(event) => event.stopPropagation()}
								onCheckedChange={(checked) =>
									handleToggleForm(row, checked)
								}
							/>
							<p className='text-xs text-muted-foreground'>
								{row.deletedAt
									? 'La tienda está inactiva.'
									: row.formEnabled
										? 'Formulario disponible para esta tienda.'
										: 'Formulario oculto para esta tienda.'}
							</p>
						</div>

						<div className='flex items-center gap-1'>
							<CopyButton value={fullUrl} size='icon-sm' />
							<Button
								type='button'
								variant='ghost'
								size='icon-sm'
								title='Abrir formulario de reclamos'
								onClick={(event) => {
									event.stopPropagation()

									window.open(
										fullUrl,
										'_blank',
										'noopener,noreferrer',
									)
								}}
							>
								<ExternalLink />
								<span className='sr-only'>
									Abrir formulario
								</span>
							</Button>
							<span className='text-xs text-muted-foreground'>
								{isPubliclyBlocked
									? 'Actualmente no estará disponible al público.'
									: path}
							</span>
						</div>
					</div>
				)
			},
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
						disabled={
							!canManage ||
							Boolean(row.deletedAt) ||
							isDeactivating
						}
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
						disabled={
							!canManage ||
							Boolean(row.deletedAt) ||
							isDeactivating
						}
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
			{loadError && (
				<div
					role='alert'
					className='rounded-lg border border-destructive/30 p-4 text-sm'
				>
					{loadError}
					<Button
						variant='outline'
						onClick={() => {
							void search()
						}}
					>
						Reintentar
					</Button>
				</div>
			)}
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>Tiendas</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Gestiona las sucursales de tu organización.
					</p>
				</div>
				<Button
					disabled={!canManage}
					onClick={() => setCreateDialogOpen(true)}
				>
					<Plus />
					Nueva tienda
				</Button>
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='space-y-4 border-b px-4 py-3'>
					{!organizationFormEnabled && (
						<div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
							El formulario global de la organización está
							desactivado. Aunque una tienda esté marcada como
							habilitada, su enlace público seguirá bloqueado
							hasta reactivarlo en Configuración.
						</div>
					)}

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
