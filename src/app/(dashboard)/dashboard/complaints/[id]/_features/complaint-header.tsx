import { AlertCircle, Calendar, CheckCircle2, Clock, Store } from 'lucide-react'
import type { FC } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatDateDisplay } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { ComplaintDetail } from '@/modules/complaints/detail-queries'
import {
	COMPLAINT_STATUS_LABEL,
	COMPLAINT_TYPE_LABEL,
	STATUS_BADGE_VARIANT,
	type DeadlineStatus,
} from './shared'

interface ComplaintHeaderProps {
	complaint: ComplaintDetail
	deadline: DeadlineStatus | null
	resolvedAt: Date | null
	hasResponse: boolean
}

export const ComplaintHeader: FC<ComplaintHeaderProps> = ({
	complaint,
	deadline,
	resolvedAt,
	hasResponse,
}) => {
	return (
		<div className='rounded-xl border bg-card px-4 py-4 space-y-3'>
			{/* Correlative + badges */}
			<div className='flex flex-wrap items-start gap-2 justify-between'>
				<div>
					<p className='text-xs text-muted-foreground'>Correlativo</p>
					<p className='font-mono text-lg font-semibold'>
						{complaint.correlative}
					</p>
					<p className='text-xs text-muted-foreground mt-0.5'>
						Cód. seguimiento:{' '}
						<span className='font-mono'>{complaint.trackingCode}</span>
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Badge>
						{COMPLAINT_TYPE_LABEL[complaint.type] ?? complaint.type}
					</Badge>
					<Badge
						variant={STATUS_BADGE_VARIANT[complaint.status] ?? 'outline'}
					>
						{COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
					</Badge>
				</div>
			</div>

			{/* Meta */}
			<div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
				<span className='flex items-center gap-1'>
					<Store className='size-3' />
					{complaint.storeName}
				</span>
				<span className='flex items-center gap-1'>
					<Calendar className='size-3' />
					Registrado el {formatDateDisplay(complaint.createdAt)}
				</span>
			</div>

			{/* Deadline banner */}
			{deadline && (
				<div
					className={cn(
						'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
						(deadline.level === 'overdue' || deadline.level === 'critical') &&
							'bg-destructive/10 text-destructive border border-destructive/20',
						deadline.level === 'warning' &&
							'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30',
						deadline.level === 'safe' && 'bg-muted text-muted-foreground border',
					)}
				>
					{deadline.level === 'overdue' || deadline.level === 'critical' ? (
						<AlertCircle className='size-4 shrink-0' />
					) : (
						<Clock className='size-4 shrink-0' />
					)}
					<span>Plazo máximo de respuesta: {deadline.label}</span>
					{complaint.responseDeadline && (
						<span className='ml-auto text-xs opacity-75'>
							{formatDateDisplay(complaint.responseDeadline)}
						</span>
					)}
				</div>
			)}

			{/* Responded banner */}
			{hasResponse && resolvedAt && (
				<div className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30'>
					<CheckCircle2 className='size-4 shrink-0' />
					<span>Respondido el {formatDateDisplay(resolvedAt)}</span>
				</div>
			)}
		</div>
	)
}
