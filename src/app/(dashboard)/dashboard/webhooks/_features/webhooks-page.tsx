'use client'

import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { feedback } from '@/lib/feedback'
import { formatDateDisplay } from '@/lib/formatters'
import { WEBHOOK_EVENT_LABELS } from '@/lib/webhook-events'
import {
	$deleteWebhookAction,
	$getWebhooksTableAction,
} from '@/modules/webhooks/actions'
import type { WebhookEndpointRow } from '@/modules/webhooks/queries'
import {
	DEFAULT_WEBHOOKS_TABLE_FILTERS,
	type WebhooksTableFilters,
} from '@/modules/webhooks/validation'
import type { WebhooksInitialState } from './types'
import { WebhookFormDialog } from './webhook-form-dialog'

const STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'active', label: 'Activos' },
	{ value: 'inactive', label: 'Eliminados' },
]

const STATUS_BADGE: Record<
	string,
	{ label: string; variant: 'default' | 'secondary' }
> = {
	active: { label: 'Activo', variant: 'default' },
	inactive: { label: 'Inactivo', variant: 'secondary' },
}

export function WebhooksPage({
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
		page,
		pageSize,
		setPage,
		setTotalItems,
		setIsLoading,
	} = useDataTable({
		getRowId: (row) => row.id,
		setRows,
		fetchData: async ({ page, pageSize, filters }) => {
			const result = await $getWebhooksTableAction({
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
		void search()
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
				if (!confirmed) return
				startDeleteTransition(async () => {
					const result = await $deleteWebhookAction(webhook.id)
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
								{WEBHOOK_EVENT_LABELS[e] ?? e}
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
								href={`/dashboard/webhooks/deliveries?endpointId=${row.id}`}
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
						render={<Link href='/dashboard/webhooks/deliveries' />}
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
					if (!open) setEditingWebhook(null)
				}}
				onSuccess={handleUpdated}
			/>
		</div>
	)
}
