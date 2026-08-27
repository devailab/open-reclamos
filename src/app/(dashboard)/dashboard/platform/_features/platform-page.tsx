'use client'

import { Ban, ExternalLink, RotateCcw } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import DataTable from '@/components/data-table'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDataTable } from '@/hooks/use-data-table'
import { feedback } from '@/lib/feedback'
import { formatDateDisplay } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
	$getPlatformOrganizationsTableAction,
	$reactivateOrganizationAction,
} from '@/modules/platform/actions'
import {
	ORGANIZATION_STATUS_LABEL,
	ORGANIZATION_STATUS_SUSPENDED,
} from '@/modules/platform/constants'
import {
	DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
	type PlatformOrganizationsTableFilters,
} from '@/modules/platform/validation'
import { SuspendOrganizationDialog } from './suspend-organization-dialog'
import type { OrganizationRow, PlatformPageProps } from './types'

const STATUS_FILTER_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todos los estados' },
	{ value: 'active', label: 'Activas' },
	{ value: 'suspended', label: 'Suspendidas' },
]

type MetricKey =
	| 'totalOrganizations'
	| 'activeOrganizations'
	| 'suspendedOrganizations'
	| 'totalStores'
	| 'totalComplaints'
	| 'complaintsLast30Days'
	| 'totalUsers'

interface MetricDefinition {
	key: MetricKey
	title: string
	description: string
	highlight?: boolean
}

const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
	{
		key: 'totalOrganizations',
		title: 'Organizaciones',
		description: 'Registradas en la plataforma',
	},
	{
		key: 'suspendedOrganizations',
		title: 'Suspendidas',
		description: 'Sin acceso al servicio',
		highlight: true,
	},
	{
		key: 'totalStores',
		title: 'Tiendas',
		description: 'Sucursales activas',
	},
	{
		key: 'totalComplaints',
		title: 'Reclamos',
		description: 'Histórico total',
	},
	{
		key: 'complaintsLast30Days',
		title: 'Reclamos (30d)',
		description: 'Ingresos del último mes',
	},
	{
		key: 'totalUsers',
		title: 'Usuarios',
		description: 'Cuentas registradas',
	},
]

export const PlatformPage: FC<PlatformPageProps> = ({ initialState }) => {
	const [rows, setRows] = useState(initialState.rows)
	const [filters, setFilters] = useState<PlatformOrganizationsTableFilters>(
		initialState.filters,
	)
	const [suspendingOrganization, setSuspendingOrganization] =
		useState<OrganizationRow | null>(null)
	const [isReactivating, startReactivateTransition] = useTransition()

	const metrics = initialState.metrics

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
		getRowId: (row: OrganizationRow) => row.id,
		setRows,
		fetchData: async ({ page, pageSize, filters }) => {
			const result = await $getPlatformOrganizationsTableAction({
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
	})

	useEffect(() => {
		setTotalItems(initialState.totalItems)
		setIsLoading(false)
	}, [initialState.totalItems, setTotalItems, setIsLoading])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `search` se recalcula en cada render por diseño del hook.
	useEffect(() => {
		// Mantiene la tabla sincronizada cuando cambia la paginación.
		autoSearch()
	}, [page, pageSize])

	const hasActiveFilters = useMemo(() => {
		return (
			filters.name.trim() !== '' ||
			filters.status !==
				DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS.status
		)
	}, [filters])

	const selectedStatusFilter =
		STATUS_FILTER_OPTIONS.find(
			(option) => option.value === filters.status,
		) ?? STATUS_FILTER_OPTIONS[0]

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
		if (event.key !== 'Enter') return
		event.preventDefault()
		handleSearch()
	}

	const handleClear = () => {
		setFilters(DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS)

		if (page !== 1) {
			setPage(1)
			return
		}

		void search(DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS)
	}

	const handleReactivate = (organization: OrganizationRow) => {
		feedback
			.confirm({
				title: 'Reactivar organización',
				description: `"${organization.name}" recuperará el acceso al dashboard, a la API y a sus formularios públicos.`,
				confirmText: 'Reactivar',
				cancelText: 'Cancelar',
			})
			.then((confirmed) => {
				if (!confirmed) return

				startReactivateTransition(async () => {
					const result = await $reactivateOrganizationAction(
						organization.id,
					)

					if ('error' in result) {
						sileo.error({
							title: 'Error al reactivar organización',
							description: result.error,
						})
						return
					}

					sileo.success({ title: 'Organización reactivada' })
					void search()
				})
			})
	}

	const columns = defineColumns([
		{
			header: { render: () => 'Organización' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.name}</p>
					<p className='text-xs text-muted-foreground'>
						RUC {row.taxId} · {row.slug}
					</p>
				</div>
			),
		},
		{
			header: { render: () => 'Estado' },
			cell: ({ row }) => {
				const isSuspended = row.status === ORGANIZATION_STATUS_SUSPENDED

				return (
					<div className='space-y-1'>
						<Badge
							variant={isSuspended ? 'destructive' : 'default'}
						>
							{ORGANIZATION_STATUS_LABEL[row.status]}
						</Badge>
						{isSuspended && row.suspensionReason && (
							<p className='max-w-60 text-xs text-muted-foreground'>
								{row.suspensionReason}
							</p>
						)}
					</div>
				)
			},
		},
		{
			header: { render: () => 'Tiendas' },
			cell: ({ row }) => row.storeCount.toLocaleString('es-PE'),
		},
		{
			header: { render: () => 'Reclamos' },
			cell: ({ row }) => row.complaintCount.toLocaleString('es-PE'),
		},
		{
			header: { render: () => 'Usuarios' },
			cell: ({ row }) => row.memberCount.toLocaleString('es-PE'),
		},
		{
			header: { render: () => 'Registro' },
			cell: ({ row }) => formatDateDisplay(row.createdAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => {
				const isSuspended = row.status === ORGANIZATION_STATUS_SUSPENDED

				return (
					<div className='flex items-center gap-1'>
						<Button
							type='button'
							variant='ghost'
							size='icon-sm'
							title='Abrir formulario público'
							onClick={(event) => {
								event.stopPropagation()
								window.open(
									`/c/${row.slug}`,
									'_blank',
									'noopener,noreferrer',
								)
							}}
						>
							<ExternalLink />
							<span className='sr-only'>
								Abrir formulario público
							</span>
						</Button>
						{isSuspended ? (
							<Button
								type='button'
								variant='outline'
								size='sm'
								disabled={isReactivating}
								onClick={(event) => {
									event.stopPropagation()
									handleReactivate(row)
								}}
							>
								<RotateCcw />
								Reactivar
							</Button>
						) : (
							<Button
								type='button'
								variant='destructive'
								size='sm'
								disabled={isReactivating}
								onClick={(event) => {
									event.stopPropagation()
									setSuspendingOrganization(row)
								}}
							>
								<Ban />
								Suspender
							</Button>
						)}
					</div>
				)
			},
		},
	])

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Plataforma</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Vista global de todas las organizaciones del servicio.
				</p>
			</div>

			<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-6'>
				{METRIC_DEFINITIONS.map((definition) => (
					<Card
						key={definition.key}
						className={cn(
							definition.highlight &&
								metrics[definition.key] > 0 &&
								'border-destructive/30 bg-destructive/5',
						)}
					>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								{definition.title}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p
								className={cn(
									'text-3xl font-semibold tracking-tight',
									definition.highlight &&
										metrics[definition.key] > 0 &&
										'text-destructive',
								)}
							>
								{metrics[definition.key].toLocaleString(
									'es-PE',
								)}
							</p>
							<p className='mt-1 text-xs text-muted-foreground'>
								{definition.description}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className='rounded-xl border bg-card'>
				<div className='space-y-4 border-b px-4 py-3'>
					<p className='text-sm text-muted-foreground'>
						{controller.store.totalItems}{' '}
						{controller.store.totalItems === 1
							? 'organización'
							: 'organizaciones'}
					</p>

					<TableFiltersBar
						primaryFilters={[
							<TextField
								key='name-filter'
								label='Buscar'
								placeholder='Nombre, razón social o RUC...'
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
								key='status-filter'
								label='Estado'
								options={STATUS_FILTER_OPTIONS}
								value={selectedStatusFilter}
								onValueChange={(value) => {
									setFilters((previous) => ({
										...previous,
										status: (value?.value ??
											DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS.status) as PlatformOrganizationsTableFilters['status'],
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

			<SuspendOrganizationDialog
				organization={suspendingOrganization}
				onClose={() => setSuspendingOrganization(null)}
				onSuccess={() => {
					setSuspendingOrganization(null)
					void search()
				}}
			/>
		</div>
	)
}
