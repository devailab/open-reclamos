'use client'

import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { formatDateDisplay } from '@/lib/formatters'
import {
	WEBHOOK_EVENT_LABELS,
	type WebhookEventKey,
} from '@/lib/webhook-events'
import { $getDeliveriesTableAction } from '@/modules/webhooks/actions'
import {
	DEFAULT_DELIVERIES_TABLE_FILTERS,
	type DeliveriesTableFilters,
} from '@/modules/webhooks/validation'
import type { DeliveriesInitialState, WebhookDeliveryRow } from './types'

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

export function DeliveriesPage({
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
		page,
		pageSize,
		setPage,
		setTotalItems,
		setIsLoading,
	} = useDataTable({
		getRowId: (row) => row.id,
		setRows,
		fetchData: async ({ page, pageSize, filters }) => {
			const result = await $getDeliveriesTableAction({
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
		void search()
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
						render={<Link href='/dashboard/webhooks' />}
					>
						<ArrowLeft className='size-4' />
						Volver a webhooks
					</Button>
					<h1 className='text-2xl font-semibold'>
						Historial de envíos
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Registro de todos los intentos de entrega de webhooks.
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
