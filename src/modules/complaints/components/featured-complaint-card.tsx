import { differenceInCalendarDays } from 'date-fns'
import {
	AlertCircleIcon,
	AlertTriangleIcon,
	CheckCircleIcon,
	ClockIcon,
	StoreIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties, FC } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateDisplay } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { DEFAULT_STORE_COLOR } from '@/modules/stores/constants'
import type { ComplaintCategorySummary } from '../dashboard-queries'

const TYPE_LABEL: Record<string, string> = {
	claim: 'Reclamo',
	complaint: 'Queja',
}

const STATUS_LABEL: Record<string, string> = {
	open: 'Abierto',
	in_progress: 'En revisión',
	in_review: 'En revisión',
	resolved: 'Resuelto',
}

const PRIORITY_LABEL: Record<string, string> = {
	urgent: 'Urgente',
	high: 'Alta',
	medium: 'Media',
	low: 'Baja',
}

const PRIORITY_BADGE_CLASS: Record<string, string> = {
	urgent: 'bg-destructive/10 text-destructive border-destructive/20',
	high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
	medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
	low: 'bg-muted text-muted-foreground border-border',
}

type DeadlineLevel = 'safe' | 'warning' | 'critical' | 'overdue'

interface DeadlineInfo {
	label: string
	level: DeadlineLevel
	progressPct: number
}

function getDeadlineInfo(
	responseDeadline: Date | null,
	responseDeadlineDays: number | null,
	createdAt: Date,
): DeadlineInfo | null {
	if (!responseDeadline) return null

	const now = new Date()
	const daysRemaining = differenceInCalendarDays(responseDeadline, now)
	const totalDays = responseDeadlineDays ?? 15
	const elapsed = differenceInCalendarDays(now, createdAt)
	const progressPct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100))

	if (daysRemaining < 0) {
		const days = Math.abs(daysRemaining)
		return {
			label: `Venció hace ${days} día${days === 1 ? '' : 's'}`,
			level: 'overdue',
			progressPct,
		}
	}
	if (daysRemaining === 0) {
		return { label: 'Vence hoy', level: 'critical', progressPct }
	}
	if (daysRemaining <= 2) {
		return {
			label: `Vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`,
			level: 'critical',
			progressPct,
		}
	}
	if (daysRemaining <= 5) {
		return {
			label: `Vence en ${daysRemaining} días`,
			level: 'warning',
			progressPct,
		}
	}
	return {
		label: `${daysRemaining} días restantes`,
		level: 'safe',
		progressPct,
	}
}

const DEADLINE_ICON: Record<DeadlineLevel, FC<{ className?: string }>> = {
	overdue: ({ className }) => (
		<AlertCircleIcon className={cn('text-destructive', className)} />
	),
	critical: ({ className }) => (
		<AlertTriangleIcon className={cn('text-orange-500', className)} />
	),
	warning: ({ className }) => (
		<ClockIcon className={cn('text-yellow-600', className)} />
	),
	safe: ({ className }) => (
		<CheckCircleIcon className={cn('text-emerald-600', className)} />
	),
}

const DEADLINE_TEXT_CLASS: Record<DeadlineLevel, string> = {
	overdue: 'text-destructive',
	critical: 'text-orange-500',
	warning: 'text-yellow-600',
	safe: 'text-emerald-600',
}

const PROGRESS_COLOR: Record<DeadlineLevel, string> = {
	overdue: 'bg-destructive',
	critical: 'bg-orange-500',
	warning: 'bg-yellow-500',
	safe: 'bg-emerald-500',
}

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i

function getStoreBadgeStyle(color: string): CSSProperties {
	const storeColor = HEX_COLOR_PATTERN.test(color)
		? color.toUpperCase()
		: DEFAULT_STORE_COLOR

	return {
		backgroundColor: `${storeColor}18`,
		borderColor: `${storeColor}4D`,
		color: storeColor,
	}
}

export interface FeaturedComplaintCardData {
	id: string
	correlative: string
	type: string
	firstName: string
	lastName: string
	storeName: string
	storeColor: string
	status: string
	priority: string
	category: ComplaintCategorySummary | null
	responseDeadline: Date | null
	responseDeadlineDays: number | null
	createdAt: Date
}

interface FeaturedComplaintCardProps {
	complaint: FeaturedComplaintCardData
}

export const FeaturedComplaintCard: FC<FeaturedComplaintCardProps> = ({
	complaint,
}) => {
	const deadline = getDeadlineInfo(
		complaint.responseDeadline,
		complaint.responseDeadlineDays,
		complaint.createdAt,
	)
	const DeadlineIcon = deadline ? DEADLINE_ICON[deadline.level] : null
	const storeBadgeStyle = getStoreBadgeStyle(complaint.storeColor)

	return (
		<Link
			href={`/dashboard/complaints/${complaint.id}`}
			className='group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
		>
			<Card className='h-full transition-[border-color,box-shadow,transform] group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md'>
				<CardContent className='flex h-full flex-col gap-3 px-4 py-0'>
					<div className='flex items-start justify-between gap-2'>
						<Badge
							variant='outline'
							className='h-5 min-w-0 max-w-[70%] px-2 text-[10px] font-semibold'
							style={storeBadgeStyle}
						>
							<StoreIcon className='size-3 shrink-0' />
							<span className='truncate'>
								{complaint.storeName}
							</span>
						</Badge>
						<span className='shrink-0 font-mono text-xs text-muted-foreground/70'>
							{complaint.correlative}
						</span>
					</div>

					<div className='space-y-1'>
						<p className='line-clamp-1 text-sm font-semibold leading-tight'>
							{complaint.firstName} {complaint.lastName}
						</p>
						<p className='text-[11px] text-muted-foreground'>
							Ingresó el {formatDateDisplay(complaint.createdAt)}
						</p>
					</div>

					<div className='flex flex-wrap gap-1.5'>
						<Badge
							variant='outline'
							className='h-4 px-1.5 text-[10px]'
						>
							{TYPE_LABEL[complaint.type] ?? complaint.type}
						</Badge>
						<Badge
							variant='outline'
							className={cn(
								'h-4 px-1.5 text-[10px]',
								PRIORITY_BADGE_CLASS[complaint.priority],
							)}
						>
							{PRIORITY_LABEL[complaint.priority] ??
								complaint.priority}
						</Badge>
						<Badge
							variant='outline'
							className='h-4 px-1.5 text-[10px]'
						>
							{STATUS_LABEL[complaint.status] ?? complaint.status}
						</Badge>
					</div>

					{complaint.category ? (
						<p className='line-clamp-1 text-xs text-muted-foreground'>
							<span className='font-medium text-foreground/80'>
								Categoría:
							</span>{' '}
							{complaint.category.name}
						</p>
					) : null}

					{deadline ? (
						<div className='mt-auto space-y-1.5 pt-1'>
							<div className='flex items-center justify-between gap-1'>
								<div className='flex min-w-0 items-center gap-1'>
									{DeadlineIcon ? (
										<DeadlineIcon className='size-3 shrink-0' />
									) : null}
									<span
										className={cn(
											'truncate text-[11px] font-medium',
											DEADLINE_TEXT_CLASS[deadline.level],
										)}
									>
										{deadline.label}
									</span>
								</div>
								<span className='shrink-0 text-[10px] text-muted-foreground'>
									{formatDateDisplay(
										complaint.responseDeadline ?? '',
									)}
								</span>
							</div>
							<div className='relative h-1.5 w-full overflow-hidden rounded-full bg-muted'>
								<div
									className={cn(
										'h-full rounded-full transition-all',
										PROGRESS_COLOR[deadline.level],
									)}
									style={{
										width: `${deadline.progressPct}%`,
									}}
								/>
							</div>
						</div>
					) : (
						<p className='mt-auto pt-1 text-[11px] text-muted-foreground'>
							Sin fecha límite definida
						</p>
					)}
				</CardContent>
			</Card>
		</Link>
	)
}
