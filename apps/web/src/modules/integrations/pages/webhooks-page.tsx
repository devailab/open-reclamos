import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Link } from 'react-router'
import { sileo } from 'sileo'
import DataTable from '@/shared/components/data-table'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useDataTable } from '@/shared/hooks/use-data-table'
import { feedback } from '@/shared/lib/feedback'
import { formatDateDisplay } from '@/shared/lib/formatters'
import { deleteWebhook, getWebhooks } from '../features/webhooks/api'
import { WEBHOOK_EVENT_LABELS } from '../features/webhooks/events'
import type {
	WebhookEndpointRow,
	WebhooksInitialState,
} from '../features/webhooks/types'
import {
	DEFAULT_WEBHOOKS_TABLE_FILTERS,
	type WebhooksTableFilters,
} from '../features/webhooks/types'
import { WebhookFormDialog } from '../features/webhooks/webhook-form-dialog'

const STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'active', label: 'Activos' },
	{ value: 'inactive', label: 'Inactivos' },
]

const STATUS_BADGE: Record<
	string,
	{ label: string; variant: 'default' | 'secondary' }
> = {
	active: { label: 'Activo', variant: 'default' },
	inactive: { label: 'Inactivo', variant: 'secondary' },
}

function WebhooksPageView({
	initialState,
}: {
	initialState: WebhooksInitialState
}) {
	const [rows, setRows] = useState(initialState.rows)

	const [filters, setFilters] = useState<WebhooksTableFilters>(
		initialState.filters,
	)

	const [isFormOpen, setFormOpen] = useState(false)

	const [editingWebhook, setEditingWebhook] =
		useState<WebhookEndpointRow | null>(null)

	const [isDeleting, startDeleteTransition] = useTransition()

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
			rows: WebhookEndpointRow[]
			totalItems: number
			page: number
		}> => {
			try {
				const result = await getWebhooks({
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

	const hasActiveFilters = useMemo(
		() =>
			filters.name.trim() !== '' ||
			filters.status !== DEFAULT_WEBHOOKS_TABLE_FILTERS.status,
		[filters],
	)

	const selectedStatusFilter =
		STATUS_FILTER_OPTIONS.find((o) => o.value === filters.status) ??
		STATUS_FILTER_OPTIONS[0]

	const handleSearch = () => {
		if (page !== 1) {
			setPage(1)

			return
		}

		void search()
	}

	const handleClear = () => {
		setFilters(DEFAULT_WEBHOOKS_TABLE_FILTERS)

		if (page !== 1) {
			setPage(1)

			return
		}
		// Consultar con los filtros por defecto sin esperar el re-render
		void search(DEFAULT_WEBHOOKS_TABLE_FILTERS)
	}

	const handleCreated = () => {
		setFormOpen(false)

		if (page !== 1) {
			setPage(1)

			return
		}

		void search()
	}

	const handleUpdated = () => {
		setEditingWebhook(null)
		void search()
	}

	const handleDelete = (webhook: WebhookEndpointRow) => {
		feedback
			.confirm({
				title: 'Eliminar webhook',
				description: `Se eliminará "${webhook.name}". Los envíos realizados se conservarán en el historial.`,
				confirmText: 'Eliminar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) {
					return
				}

				startDeleteTransition(async () => {
					const result = await deleteWebhook(webhook.id)

					if ('error' in result) {
						sileo.error({
							title: 'Error al eliminar webhook',
							description: result.error,
						})

						return
					}

					sileo.success({ title: 'Webhook eliminado' })
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
					<p className='text-xs text-muted-foreground truncate max-w-64'>
						{row.targetUrl}
					</p>
				</div>
			),
		},
		{
			header: { render: () => 'Eventos' },
			cell: ({ row }) => (
				<div className='flex flex-wrap gap-1'>
					{row.events.length === 0 ? (
						<span className='text-xs text-muted-foreground'>
							Sin eventos
						</span>
					) : (
						row.events.map((e) => (
							<Badge
								key={e}
								variant='outline'
								className='text-xs'
							>
								{WEBHOOK_EVENT_LABELS[
									e as keyof typeof WEBHOOK_EVENT_LABELS
								] ?? e}
							</Badge>
						))
					)}
				</div>
			),
		},
		{
			header: { render: () => 'Estado' },
			cell: ({ row }) => {
				if (row.deletedAt) {
					return <Badge variant='secondary'>Eliminado</Badge>
				}

				const badge = STATUS_BADGE[row.status] ?? {
					label: row.status,
					variant: 'secondary' as const,
				}

				return <Badge variant={badge.variant}>{badge.label}</Badge>
			},
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
						title='Ver envíos'
						nativeButton={false}
						render={
							<Link
								to={`/dashboard/webhooks/deliveries?endpointId=${row.id}`}
							/>
						}
					>
						<ExternalLink />
						<span className='sr-only'>Ver envíos</span>
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon-sm'
						title='Editar webhook'
						disabled={Boolean(row.deletedAt) || isDeleting}
						onClick={(e) => {
							e.stopPropagation()
							setEditingWebhook(row)
						}}
					>
						<Pencil />
						<span className='sr-only'>Editar</span>
					</Button>
					<Button
						type='button'
						variant='destructive'
						size='icon-sm'
						title='Eliminar webhook'
						disabled={Boolean(row.deletedAt) || isDeleting}
						onClick={(e) => {
							e.stopPropagation()
							handleDelete(row)
						}}
					>
						<Trash2 />
						<span className='sr-only'>Eliminar</span>
					</Button>
				</div>
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>Webhooks</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Recibe notificaciones HTTP cuando ocurran eventos en tus
						reclamos.
					</p>
				</div>
				<div className='flex items-center gap-2'>
					<Button
						variant='outline'
						nativeButton={false}
						render={<Link to='/dashboard/webhooks/deliveries' />}
					>
						Ver envíos
					</Button>
					<Button onClick={() => setFormOpen(true)}>
						<Plus />
						Nuevo webhook
					</Button>
				</div>
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='space-y-4 border-b px-4 py-3'>
					<p className='text-sm text-muted-foreground'>
						{controller.store.totalItems}{' '}
						{controller.store.totalItems === 1
							? 'webhook'
							: 'webhooks'}
					</p>

					<TableFiltersBar
						primaryFilters={[
							<TextField
								key='name-filter'
								label='Nombre'
								placeholder='Buscar por nombre...'
								value={filters.name}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault()
										handleSearch()
									}
								}}
								onValueChange={(v) =>
									setFilters((p) => ({ ...p, name: v ?? '' }))
								}
							/>,
							<SelectField
								key='status-filter'
								label='Estado'
								options={STATUS_FILTER_OPTIONS}
								value={selectedStatusFilter}
								onValueChange={(v) =>
									setFilters((p) => ({
										...p,
										status: (v?.value ??
											DEFAULT_WEBHOOKS_TABLE_FILTERS.status) as WebhooksTableFilters['status'],
									}))
								}
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

			<WebhookFormDialog
				webhook={null}
				open={isFormOpen}
				onOpenChange={setFormOpen}
				onSuccess={handleCreated}
			/>

			<WebhookFormDialog
				webhook={editingWebhook}
				open={Boolean(editingWebhook)}
				onOpenChange={(open) => {
					if (!open) {
						setEditingWebhook(null)
					}
				}}
				onSuccess={handleUpdated}
			/>
		</div>
	)
}

export function WebhooksPage() {
	const [initialState, setInitialState] =
		useState<WebhooksInitialState | null>(null)

	const [error, setError] = useState<string | null>(null)
	const [revision, setRevision] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision dispara intencionalmente una nueva carga al pulsar Reintentar.
	useEffect(() => {
		const abort = new AbortController()

		setInitialState(null)
		setError(null)

		const filters = DEFAULT_WEBHOOKS_TABLE_FILTERS

		getWebhooks({ page: 1, pageSize: 10, filters }, abort.signal)
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

	return <WebhooksPageView initialState={initialState} />
}
