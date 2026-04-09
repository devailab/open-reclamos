import { differenceInCalendarDays } from 'date-fns'
import {
	AlertCircleIcon,
	AlertTriangleIcon,
	CheckCircleIcon,
	ClockIcon,
	StoreIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateDisplay } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { FeaturedComplaint } from '@/modules/complaints/dashboard-queries'

// ── Labels ────────────────────────────────────────────────────────────────────

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

// ── Deadline helpers ──────────────────────────────────────────────────────────

type DeadlineLevel = 'safe' | 'warning' | 'critical' | 'overdue'

interface DeadlineInfo {
	daysRemaining: number
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

	let label: string
	let level: DeadlineLevel

	if (daysRemaining < 0) {
		label = `Venció hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) === 1 ? '' : 's'}`
		level = 'overdue'
	} else if (daysRemaining === 0) {
		label = 'Vence hoy'
		level = 'critical'
	} else if (daysRemaining <= 2) {
		label = `Vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`
		level = 'critical'
	} else if (daysRemaining <= 5) {
		label = `Vence en ${daysRemaining} días`
		level = 'warning'
	} else {
		label = `${daysRemaining} días restantes`
		level = 'safe'
	}

	return { daysRemaining, label, level, progressPct }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const PRIORITY_BADGE_CLASS: Record<string, string> = {
	urgent: 'bg-destructive/10 text-destructive border-destructive/20',
	high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
	medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
	low: 'bg-muted text-muted-foreground border-border',
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

const PROGRESS_COLOR: Record<DeadlineLevel, string> = {
	overdue: 'bg-destructive',
	critical: 'bg-orange-500',
	warning: 'bg-yellow-500',
	safe: 'bg-emerald-500',
}

// ── Card ──────────────────────────────────────────────────────────────────────

const FeaturedComplaintCard: FC<{ complaint: FeaturedComplaint }> = ({
	complaint,
}) => {
	const deadline = getDeadlineInfo(
		complaint.responseDeadline,
		complaint.responseDeadlineDays,
		complaint.createdAt,
	)

	const DeadlineIcon = deadline ? DEADLINE_ICON[deadline.level] : null

	return (
		<Link
			href={`/dashboard/complaints/${complaint.id}`}
			className='block group'
		>
			<Card className='h-full transition-shadow hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring'>
				<CardContent className='flex flex-col gap-3 px-4 py-2'>
					{/* Store + correlative */}
					<div className='flex items-start justify-between gap-2'>
						<div className='flex items-center gap-1.5 min-w-0'>
							<StoreIcon className='size-3.5 shrink-0 text-muted-foreground' />
							<span className='text-xs font-medium text-muted-foreground truncate'>
								{complaint.storeName}
							</span>
						</div>
						<span className='text-xs text-muted-foreground/70 shrink-0 font-mono'>
							{complaint.correlative}
						</span>
					</div>

					{/* Consumer name */}
					<p className='text-sm font-semibold leading-tight'>
						{complaint.firstName} {complaint.lastName}
					</p>

					{/* Badges */}
					<div className='flex flex-wrap gap-1.5'>
						<Badge
							variant='outline'
							className='text-[10px] h-4 px-1.5'
						>
							{TYPE_LABEL[complaint.type] ?? complaint.type}
						</Badge>
						<Badge
							variant='outline'
							className={cn(
								'text-[10px] h-4 px-1.5',
								PRIORITY_BADGE_CLASS[complaint.priority],
							)}
						>
							{PRIORITY_LABEL[complaint.priority] ??
								complaint.priority}
						</Badge>
						<Badge
							variant='outline'
							className='text-[10px] h-4 px-1.5'
						>
							{STATUS_LABEL[complaint.status] ?? complaint.status}
						</Badge>
					</div>

					{/* Deadline bar */}
					{deadline ? (
						<div className='mt-auto space-y-1.5'>
							<div className='flex items-center justify-between gap-1'>
								<div className='flex items-center gap-1'>
									{DeadlineIcon && (
										<DeadlineIcon className='size-3' />
									)}
									<span
										className={cn(
											'text-[11px] font-medium',
											deadline.level === 'overdue' &&
												'text-destructive',
											deadline.level === 'critical' &&
												'text-orange-500',
											deadline.level === 'warning' &&
												'text-yellow-600',
											deadline.level === 'safe' &&
												'text-emerald-600',
										)}
									>
										{deadline.label}
									</span>
								</div>
								<span className='text-[10px] text-muted-foreground'>
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
						<div className='mt-auto'>
							<span className='text-[11px] text-muted-foreground'>
								Sin fecha límite definida
							</span>
						</div>
					)}
				</CardContent>
			</Card>
		</Link>
	)
}

// ── Section ───────────────────────────────────────────────────────────────────

interface FeaturedComplaintsProps {
	complaints: FeaturedComplaint[]
}

export const FeaturedComplaints: FC<FeaturedComplaintsProps> = ({
	complaints,
}) => {
	if (complaints.length === 0) return null

	return (
		<div className='space-y-3'>
			<div>
				<h2 className='text-base font-semibold'>Reclamos destacados</h2>
				<p className='text-xs text-muted-foreground mt-0.5'>
					Los más urgentes según vencimiento y prioridad
				</p>
			</div>
			<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
				{complaints.map((complaint) => (
					<FeaturedComplaintCard
						key={complaint.id}
						complaint={complaint}
					/>
				))}
			</div>
		</div>
	)
}
