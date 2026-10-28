import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { sileo } from 'sileo'
import DataTable from '@/shared/components/data-table'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useDataTable } from '@/shared/hooks/use-data-table'
import { formatDateDisplay } from '@/shared/lib/formatters'
import { getDeliveries } from '../features/webhooks/api'
import {
	deliveryRetryBlockReason,
	retryDeliveryAndWait,
	waitForDeliveryChange,
} from '../features/webhooks/delivery-retry'
import {
	WEBHOOK_EVENT_LABELS,
	type WebhookEventKey,
} from '../features/webhooks/events'
import type {
	DeliveriesInitialState,
	WebhookDeliveryRow,
} from '../features/webhooks/types'
import {
	DEFAULT_DELIVERIES_TABLE_FILTERS,
	type DeliveriesTableFilters,
} from '../features/webhooks/types'

const STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'sent', label: 'Enviado' },
	{ value: 'failed', label: 'Fallido' },
	{ value: 'pending', label: 'Pendiente' },
]

const STATUS_BADGE: Record<
	string,
	{
		label: string
		variant: 'default' | 'secondary' | 'destructive' | 'outline'
	}
> = {
	sent: { label: 'Enviado', variant: 'default' },
	failed: { label: 'Fallido', variant: 'destructive' },
	pending: { label: 'Pendiente', variant: 'secondary' },
}

function RetryDeliveryButton({
	row,
	onRetried,
}: {
	row: WebhookDeliveryRow
	onRetried: () => void
}) {
	const [isPending, setIsPending] = useState(false)
	const [awaitingResult, setAwaitingResult] = useState(false)
	const request = useRef<AbortController | null>(null)
	const queued = useRef<WebhookDeliveryRow | null>(null)
	const blockReason = deliveryRetryBlockReason(row)

	useEffect(() => () => request.current?.abort(), [])

	useEffect(() => {
		const baseline = queued.current

		if (
			baseline &&
			(row.status !== baseline.status ||
				row.attemptCount > baseline.attemptCount)
		) {
			queued.current = null
			setAwaitingResult(false)
		}
	}, [row.status, row.attemptCount])

	async function handleRetry() {
		if (isPending || request.current || blockReason) {
			return
		}

		const controller = new AbortController()

		request.current = controller
		setIsPending(true)

		try {
			const result = queued.current
				? await waitForDeliveryChange(queued.current, controller.signal)
				: await retryDeliveryAndWait(row, controller.signal, () => {
						queued.current = row
						setAwaitingResult(true)

						sileo.info({
							title: 'Reintento encolado',
							description: 'Esperando el resultado del envío.',
						})
					})

			if (controller.signal.aborted) {
				return
			}

			if (result.kind === 'completed') {
				queued.current = null
				setAwaitingResult(false)

				if (result.row.status === 'sent') {
					sileo.success({ title: 'Webhook entregado' })
				} else {
					sileo.error({
						title: 'El reintento falló',
						description:
							result.row.error_message ||
							'No se pudo entregar el webhook.',
					})
				}
			} else {
				sileo.warning({
					title:
						result.kind === 'timeout'
							? 'Resultado todavía pendiente'
							: 'Entrega fuera del historial disponible',
					description:
						'Consulta nuevamente el estado. No se creará otro reintento.',
				})
			}

			onRetried()
		} catch (error) {
			if (!controller.signal.aborted) {
				sileo.error({
					title: 'No se pudo consultar o reintentar el envío',
					description:
						error instanceof Error
							? error.message
							: 'Intenta nuevamente.',
				})
			}
		} finally {
			if (!controller.signal.aborted) {
				setIsPending(false)
			}
			if (request.current === controller) {
				request.current = null
			}
		}
	}

	return (
		<div className='space-y-1'>
			<Button
				variant='outline'
				size='sm'
				disabled={isPending || Boolean(blockReason)}
				title={blockReason ?? undefined}
				onClick={() => void handleRetry()}
			>
				{isPending
					? 'Esperando resultado...'
					: awaitingResult
						? 'Consultar estado'
						: 'Reintentar'}
			</Button>
			{blockReason && row.status !== 'sent' ? (
				<p className='max-w-60 text-xs text-muted-foreground'>
					{blockReason}
				</p>
			) : null}
		</div>
	)
}

function DeliveryDetail({ row }: { row: WebhookDeliveryRow }) {
	const [open, setOpen] = useState(false)

	return (
		<div>
			<button
				type='button'
				className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors'
				onClick={() => setOpen((p) => !p)}
			>
				{open ? (
					<ChevronDown className='size-3' />
				) : (
					<ChevronRight className='size-3' />
				)}
				Detalles
			</button>
			{open && (
				<div className='mt-2 space-y-1 rounded-md bg-muted p-3 text-xs'>
					{row.responseStatus && (
						<p>
							<span className='font-medium'>HTTP:</span>{' '}
							{row.responseStatus}
						</p>
					)}
					{row.errorMessage && (
						<p className='text-destructive'>
							<span className='font-medium'>Error:</span>{' '}
							{row.errorMessage}
						</p>
					)}
					{row.sentAt && (
						<p>
							<span className='font-medium'>Enviado:</span>{' '}
							{formatDateDisplay(row.sentAt)}
						</p>
					)}
					<p>
						<span className='font-medium'>Intentos:</span>{' '}
						{row.attemptCount}
					</p>
				</div>
			)}
		</div>
	)
}

function DeliveriesPageView({
	initialState,
}: {
	initialState: DeliveriesInitialState
}) {
	const [rows, setRows] = useState(initialState.rows)

	const [filters, setFilters] = useState<DeliveriesTableFilters>(
		initialState.filters,
	)

	const endpointSelectOptions: SelectOption[] = useMemo(
		() => [
			{ value: 'all', label: 'Todos los webhooks' },
			...initialState.endpointOptions.map((e) => ({
				value: e.id,
				label: e.name,
			})),
		],
		[initialState.endpointOptions],
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
		fetchData: async ({
			page,
			pageSize,
			filters,
		}): Promise<{
			rows: WebhookDeliveryRow[]
			totalItems: number
			page: number
		}> => {
			try {
				const result = await getDeliveries({
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
			filters.endpointId !==
				DEFAULT_DELIVERIES_TABLE_FILTERS.endpointId ||
			filters.status !== DEFAULT_DELIVERIES_TABLE_FILTERS.status,
		[filters],
	)

	const selectedEndpointFilter =
		endpointSelectOptions.find((o) => o.value === filters.endpointId) ??
		endpointSelectOptions[0]

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
		setFilters(DEFAULT_DELIVERIES_TABLE_FILTERS)

		if (page !== 1) {
			setPage(1)

			return
		}
		// Consultar con los filtros por defecto sin esperar el re-render
		void search(DEFAULT_DELIVERIES_TABLE_FILTERS)
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Evento' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>
						{WEBHOOK_EVENT_LABELS[
							row.eventKey as WebhookEventKey
						] ?? row.eventKey}
					</p>
					<code className='text-[10px] text-muted-foreground'>
						{row.eventKey}
					</code>
				</div>
			),
		},
		{
			header: { render: () => 'Webhook' },
			cell: ({ row }) => (
				<span className='text-sm'>
					{row.endpointName ?? (
						<span className='text-muted-foreground'>Eliminado</span>
					)}
				</span>
			),
		},
		{
			header: { render: () => 'Estado' },
			cell: ({ row }) => {
				const badge = STATUS_BADGE[row.status] ?? {
					label: row.status,
					variant: 'outline' as const,
				}

				return <Badge variant={badge.variant}>{badge.label}</Badge>
			},
		},
		{
			header: { render: () => 'Fecha' },
			cell: ({ row }) => (
				<span className='text-sm text-muted-foreground'>
					{formatDateDisplay(row.createdAt)}
				</span>
			),
		},
		{
			header: { render: () => 'Detalles' },
			cell: ({ row }) => <DeliveryDetail row={row} />,
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<RetryDeliveryButton
					row={row}
					onRetried={() => {
						void search()
					}}
				/>
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<Button
						variant='ghost'
						size='sm'
						className='-ml-2 mb-2'
						nativeButton={false}
						render={<Link to='/dashboard/webhooks' />}
					>
						<ArrowLeft className='size-4' />
						Volver a webhooks
					</Button>
					<h1 className='text-2xl font-semibold'>
						Historial de envíos
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Registro de las últimas 100 entregas de webhooks.
					</p>
				</div>
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='space-y-4 border-b px-4 py-3'>
					<p className='text-sm text-muted-foreground'>
						{controller.store.totalItems}{' '}
						{controller.store.totalItems === 1 ? 'envío' : 'envíos'}
					</p>

					<TableFiltersBar
						primaryFilters={[
							<SelectField
								key='endpoint-filter'
								label='Webhook'
								options={endpointSelectOptions}
								value={selectedEndpointFilter}
								onValueChange={(v) =>
									setFilters((p) => ({
										...p,
										endpointId: v?.value ?? 'all',
									}))
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
										status: v?.value ?? 'all',
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
		</div>
	)
}

export function DeliveriesPage() {
	const [params] = useSearchParams()
	const endpointId = params.get('endpointId') || 'all'

	const [initialState, setInitialState] =
		useState<DeliveriesInitialState | null>(null)

	const [error, setError] = useState<string | null>(null)
	const [revision, setRevision] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision dispara intencionalmente una nueva carga al pulsar Reintentar.
	useEffect(() => {
		const abort = new AbortController()

		setInitialState(null)
		setError(null)

		const filters = { ...DEFAULT_DELIVERIES_TABLE_FILTERS, endpointId }

		getDeliveries({ page: 1, pageSize: 20, filters }, abort.signal)
			.then((table) => ({ ...table, pageSize: 20, filters }))
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
	}, [revision, endpointId])

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

	return <DeliveriesPageView initialState={initialState} />
}
