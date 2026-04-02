'use client'

import { differenceInCalendarDays } from 'date-fns'
import { AlertCircle, Clock, Eye, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { useDataTable } from '@/hooks/use-data-table'
import { formatDateDisplay } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { $getComplaintsTableAction } from '@/modules/complaints/dashboard-actions'
import {
	type ComplaintsTableFilters,
	DEFAULT_COMPLAINTS_TABLE_FILTERS,
} from '@/modules/complaints/dashboard-validation'
import type { ComplaintsPageProps } from './types'

// ── Labels ────────────────────────────────────────────────────────────────────

const COMPLAINT_TYPE_LABEL: Record<string, string> = {
	complaint: 'Queja',
	claim: 'Reclamo',
}

const COMPLAINT_STATUS_LABEL: Record<string, string> = {
	open: 'Abierto',
	in_progress: 'En revisión',
	in_review: 'En revisión',
	resolved: 'Resuelto',
}

const COMPLAINT_PRIORITY_LABEL: Record<string, string> = {
	low: 'Baja',
	medium: 'Media',
	high: 'Alta',
	urgent: 'Urgente',
}

// ── Filter options ─────────────────────────────────────────────────────────────

const TYPE_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los tipos' },
	{ value: 'complaint', label: 'Queja' },
	{ value: 'claim', label: 'Reclamo' },
]

const STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'open', label: 'Abierto' },
	{ value: 'in_review', label: 'En revisión' },
	{ value: 'resolved', label: 'Resuelto' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
	open: 'default',
	in_progress: 'outline',
	in_review: 'outline',
	resolved: 'secondary',
}

const PRIORITY_BADGE_CLASS: Record<string, string> = {
	low: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300',
	medium: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300',
	high: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
	urgent: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300',
}

const ACTIVE_STATUSES = new Set(['open', 'in_progress', 'in_review'])

interface DeadlineInfo {
	label: string
	isOverdue: boolean
	isNear: boolean
}

const getDeadlineInfo = (
	responseDeadline: Date | null,
	status: string,
): DeadlineInfo | null => {
	if (!responseDeadline || !ACTIVE_STATUSES.has(status)) return null

	const days = differenceInCalendarDays(responseDeadline, new Date())

	if (days < 0) return { label: 'Vencido', isOverdue: true, isNear: false }
	if (days === 0)
		return { label: 'Vence hoy', isOverdue: true, isNear: false }
	if (days <= 3)
		return {
			label: `Vence en ${days} día${days === 1 ? '' : 's'}`,
			isOverdue: false,
			isNear: true,
		}

	return null
}

// ── Component ──────────────────────────────────────────────────────────────────

export const ComplaintsPage: FC<ComplaintsPageProps> = ({ initialState }) => {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<ComplaintsTableFilters>(
		initialState.filters,
	)

	const storeFilterOptions: SelectOption[] = useMemo(
		() => [
			{ value: 'all', label: 'Todas las tiendas' },
			...initialState.storeOptions.map((s) => ({
				value: s.id,
				label: s.name,
			})),
		],
		[initialState.storeOptions],
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
			const result = await $getComplaintsTableAction({
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

	const hasActiveFilters = useMemo(() => {
		return (
			filters.search.trim() !== '' ||
			filters.type !== DEFAULT_COMPLAINTS_TABLE_FILTERS.type ||
			filters.status !== DEFAULT_COMPLAINTS_TABLE_FILTERS.status ||
			filters.storeId !== DEFAULT_COMPLAINTS_TABLE_FILTERS.storeId
		)
	}, [filters])

	const selectedTypeFilter =
		TYPE_FILTER_OPTIONS.find((o) => o.value === filters.type) ??
		TYPE_FILTER_OPTIONS[0]

	const selectedStatusFilter =
		STATUS_FILTER_OPTIONS.find((o) => o.value === filters.status) ??
		STATUS_FILTER_OPTIONS[0]

	const selectedStoreFilter =
		storeFilterOptions.find((o) => o.value === filters.storeId) ??
		storeFilterOptions[0]

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
		setFilters(DEFAULT_COMPLAINTS_TABLE_FILTERS)
		if (page !== 1) {
			setPage(1)
			return
		}
		void search()
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Correlativo' },
			cell: ({ row }) => (
				<span className='font-mono text-xs font-medium'>
					{row.correlative}
				</span>
			),
		},
		{
			header: { render: () => 'Tipo' },
			cell: ({ row }) => (
				<span className='text-sm'>
					{COMPLAINT_TYPE_LABEL[row.type] ?? row.type}
				</span>
			),
		},
		{
			header: { render: () => 'Cliente' },
			cell: ({ row }) => (
				<span className='text-sm'>
					{row.firstName} {row.lastName}
				</span>
			),
		},
		{
			header: { render: () => 'Tienda' },
			cell: ({ row }) => (
				<span className='text-sm text-muted-foreground'>
					{row.storeName}
				</span>
			),
		},
		{
			header: { render: () => 'Estado' },
			cell: ({ row }) => {
				const deadline = getDeadlineInfo(
					row.responseDeadline,
					row.status,
				)
				return (
					<div className='flex flex-col gap-1'>
						<Badge
							variant={
								STATUS_BADGE_VARIANT[row.status] ?? 'outline'
							}
						>
							{COMPLAINT_STATUS_LABEL[row.status] ?? row.status}
						</Badge>
						{deadline && (
							<span
								className={cn(
									'inline-flex items-center gap-0.5 text-[10px] font-medium',
									deadline.isOverdue
										? 'text-destructive'
										: 'text-amber-600 dark:text-amber-400',
								)}
							>
								{deadline.isOverdue ? (
									<AlertCircle className='size-2.5 shrink-0' />
								) : (
									<Clock className='size-2.5 shrink-0' />
								)}
								{deadline.label}
							</span>
						)}
					</div>
				)
			},
		},
		{
			header: { render: () => 'Prioridad' },
			cell: ({ row }) => (
				<Badge
					variant='outline'
					className={cn(
						PRIORITY_BADGE_CLASS[row.priority] ??
							PRIORITY_BADGE_CLASS.medium,
					)}
				>
					{COMPLAINT_PRIORITY_LABEL[row.priority] ?? row.priority}
				</Badge>
			),
		},
		{
			header: { render: () => 'Tags' },
			cell: ({ row }) => {
				if (row.tags.length === 0) {
					return (
						<span className='text-sm text-muted-foreground'>—</span>
					)
				}

				return (
					<div className='flex flex-wrap gap-1'>
						{row.tags.slice(0, 3).map((tag) => (
							<Badge
								key={tag.id}
								variant='outline'
								className='max-w-36 truncate'
								style={
									tag.color
										? {
												borderColor: tag.color,
												color: tag.color,
											}
										: undefined
								}
							>
								{tag.name}
							</Badge>
						))}
					</div>
				)
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
			header: { render: () => '' },
			cell: ({ row }) => {
				const isRespondable =
					!row.hasResponse &&
					(row.status === 'open' ||
						row.status === 'in_progress' ||
						row.status === 'in_review')
				return (
					<div className='flex items-center justify-end gap-1'>
						{isRespondable && (
							<Link
								href={`/dashboard/complaints/${row.id}`}
								title='Responder reclamo'
								className={buttonVariants({
									variant: 'ghost',
									size: 'icon',
								})}
							>
								<MessageSquare className='size-4' />
							</Link>
						)}
						<Link
							href={`/dashboard/complaints/${row.id}`}
							title='Ver detalles'
							className={buttonVariants({
								variant: 'ghost',
								size: 'icon',
							})}
						>
							<Eye className='size-4' />
						</Link>
					</div>
				)
			},
		},
	])

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Reclamos</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Gestiona los reclamos y quejas registrados en tu
					organización.
				</p>
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='space-y-4 border-b px-4 py-3'>
					<p className='text-sm text-muted-foreground'>
						{controller.store.totalItems}{' '}
						{controller.store.totalItems === 1
							? 'reclamo'
							: 'reclamos'}
					</p>

					<TableFiltersBar
						primaryFilters={[
							<TextField
								key='search-filter'
								label='Buscar'
								placeholder='Correlativo, nombre...'
								value={filters.search}
								onKeyDown={handleSearchKeyDown}
								onValueChange={(value) => {
									setFilters((prev) => ({
										...prev,
										search: value ?? '',
									}))
								}}
							/>,
							<SelectField
								key='type-filter'
								label='Tipo'
								options={TYPE_FILTER_OPTIONS}
								value={selectedTypeFilter}
								onValueChange={(value) => {
									setFilters((prev) => ({
										...prev,
										type: (value?.value ??
											DEFAULT_COMPLAINTS_TABLE_FILTERS.type) as ComplaintsTableFilters['type'],
									}))
								}}
							/>,
							<SelectField
								key='status-filter'
								label='Estado'
								options={STATUS_FILTER_OPTIONS}
								value={selectedStatusFilter}
								onValueChange={(value) => {
									setFilters((prev) => ({
										...prev,
										status: (value?.value ??
											DEFAULT_COMPLAINTS_TABLE_FILTERS.status) as ComplaintsTableFilters['status'],
									}))
								}}
							/>,
						]}
						advancedFilters={
							initialState.storeOptions.length > 1
								? [
										<SelectField
											key='store-filter'
											label='Tienda'
											options={storeFilterOptions}
											value={selectedStoreFilter}
											onValueChange={(value) => {
												setFilters((prev) => ({
													...prev,
													storeId:
														value?.value ?? 'all',
												}))
											}}
										/>,
									]
								: []
						}
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
