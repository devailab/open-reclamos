'use client'

import type { FC } from 'react'
import { useMemo, useState, useTransition } from 'react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import { sileo } from 'sileo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart'
import { formatDateDisplay } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { $getComplaintsDashboardMetricsAction } from '@/modules/complaints/dashboard-actions'
import type { ComplaintsDashboardKpis } from '@/modules/complaints/dashboard-queries'
import type { DashboardTrendDays } from '@/modules/complaints/dashboard-validation'
import type { DashboardPageProps } from './types'

const RANGE_OPTIONS: DashboardTrendDays[] = [7, 15, 30]

const CHART_CONFIG = {
	count: {
		label: 'Reclamos',
		color: 'var(--chart-1)',
	},
} satisfies ChartConfig

type KpiDefinition = {
	key: keyof ComplaintsDashboardKpis
	title: string
	description: string
	highlight?: boolean
}

const KPI_DEFINITIONS: readonly KpiDefinition[] = [
	{
		key: 'total',
		title: 'Total reclamos',
		description: 'Carga total registrada',
	},
	{
		key: 'open',
		title: 'Abiertos',
		description: 'Pendientes de atención',
	},
	{
		key: 'inProgress',
		title: 'En revisión',
		description: 'Actualmente en proceso',
	},
	{
		key: 'resolved',
		title: 'Resueltos',
		description: 'Cerrados con respuesta',
	},
	{
		key: 'overdue',
		title: 'Vencidos',
		description: 'Fuera del plazo legal',
		highlight: true,
	},
]

export const DashboardPage: FC<DashboardPageProps> = ({
	userName,
	initialState,
}) => {
	const [days, setDays] = useState<DashboardTrendDays>(initialState.days)
	const [kpis, setKpis] = useState(initialState.kpis)
	const [trend, setTrend] = useState(initialState.trend)
	const [isPending, startTransition] = useTransition()

	const chartData = useMemo(
		() =>
			trend.map((item) => ({
				...item,
				label: formatDateDisplay(item.date),
			})),
		[trend],
	)

	const handleRangeChange = (nextDays: DashboardTrendDays) => {
		if (nextDays === days) return

		startTransition(async () => {
			const result = await $getComplaintsDashboardMetricsAction({
				days: nextDays,
			})

			if (!result) {
				sileo.error({
					title: 'No se pudo actualizar el dashboard',
					description: 'Intenta nuevamente en unos segundos.',
				})
				return
			}

			setDays(result.days)
			setKpis(result.kpis)
			setTrend(result.trend)
		})
	}

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Dashboard</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Bienvenido, {userName}
				</p>
			</div>

			<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
				{KPI_DEFINITIONS.map((definition) => (
					<Card
						key={definition.key}
						className={cn(
							definition.highlight &&
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
									definition.highlight && 'text-destructive',
								)}
							>
								{kpis[definition.key].toLocaleString('es-PE')}
							</p>
							<p className='mt-1 text-xs text-muted-foreground'>
								{definition.description}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<CardTitle>Evolución de reclamos</CardTitle>
						<p className='mt-1 text-xs text-muted-foreground'>
							Ingresos diarios para los últimos {days} días.
						</p>
					</div>
					<div className='inline-flex items-center gap-2'>
						{RANGE_OPTIONS.map((option) => (
							<Button
								key={option}
								type='button'
								size='sm'
								variant={
									days === option ? 'default' : 'outline'
								}
								onClick={() => handleRangeChange(option)}
								disabled={isPending}
							>
								{option}d
							</Button>
						))}
					</div>
				</CardHeader>
				<CardContent>
					<ChartContainer
						config={CHART_CONFIG}
						className='h-70 w-full'
					>
						<LineChart data={chartData}>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey='label'
								tickLine={false}
								axisLine={false}
								minTickGap={24}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent indicator='line' />
								}
							/>
							<Line
								type='monotone'
								dataKey='count'
								name='Reclamos'
								stroke='var(--color-count)'
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ChartContainer>
					<div className='mt-3'>
						<Badge variant='outline'>
							Total últimos {days} días:{' '}
							{trend
								.reduce((acc, item) => acc + item.count, 0)
								.toLocaleString('es-PE')}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
