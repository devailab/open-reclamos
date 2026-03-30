'use client'

import { ArrowLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { type FC, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ChangeableStatus } from '@/modules/complaints/dashboard-validation'
import { $changeComplaintStatusAction } from '@/modules/complaints/detail-actions'
import { ComplaintAuditCard } from './complaint-audit-card'
import { ComplaintConsumerCard } from './complaint-consumer-card'
import { ComplaintDetailsCard } from './complaint-details-card'
import { ComplaintHeader } from './complaint-header'
import { ComplaintSolutionCard } from './complaint-solution-card'
import { COMPLAINT_STATUS_LABEL, getDeadlineStatus } from './shared'
import type { ComplaintDetailPageProps } from './types'

const STATUS_CHANGE_OPTIONS: { value: ChangeableStatus; label: string }[] = [
	{ value: 'in_progress', label: COMPLAINT_STATUS_LABEL.in_progress },
	{ value: 'in_review', label: COMPLAINT_STATUS_LABEL.in_review },
	{ value: 'closed', label: COMPLAINT_STATUS_LABEL.closed },
]

export const ComplaintDetailPage: FC<ComplaintDetailPageProps> = ({
	complaint,
	auditHistory,
	history,
	attachments,
}) => {
	const [currentStatus, setCurrentStatus] = useState(complaint.status)
	const [resolvedResponse, setResolvedResponse] = useState<string | null>(
		complaint.officialResponse,
	)
	const [resolvedAt, setResolvedAt] = useState<Date | null>(
		complaint.respondedAt,
	)
	const [respondedByName, setRespondedByName] = useState<string | null>(
		complaint.respondedByName,
	)
	const [historyEntries, setHistoryEntries] = useState(history)
	const [isPending, startTransition] = useTransition()

	const isRespondable =
		!resolvedResponse &&
		(currentStatus === 'open' ||
			currentStatus === 'in_progress' ||
			currentStatus === 'in_review')

	const deadline = getDeadlineStatus(
		complaint.responseDeadline,
		currentStatus,
	)

	const handleResponseSuccess = (result: {
		response: string
		respondedAt: string
		respondedByName: string | null
		publicNote: string
	}) => {
		setResolvedResponse(result.response)
		setResolvedAt(new Date(result.respondedAt))
		setRespondedByName(result.respondedByName)
		setCurrentStatus('resolved')
		setHistoryEntries((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				eventType: 'response_added',
				fromStatus: currentStatus,
				toStatus: 'resolved',
				publicNote: result.publicNote,
				internalNote: null,
				performedByName: result.respondedByName,
				performedByRole: 'operator',
				createdAt: new Date(result.respondedAt),
			},
		])
	}

	const handleStatusChange = (status: ChangeableStatus) => {
		startTransition(async () => {
			const result = await $changeComplaintStatusAction({
				id: complaint.id,
				status,
			})
			if (!result.success) {
				sileo.error({
					title: 'Error al cambiar estado',
					description: result.error ?? 'Intenta de nuevo.',
				})
				return
			}
			setCurrentStatus(status)
			setHistoryEntries((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					eventType: 'status_changed',
					fromStatus: currentStatus,
					toStatus: status,
					publicNote: null,
					internalNote: null,
					performedByName: null,
					performedByRole: 'operator',
					createdAt: new Date(),
				},
			])
			sileo.success({ title: 'Estado actualizado correctamente' })
		})
	}

	const canChangeStatus =
		currentStatus !== 'resolved' && currentStatus !== 'closed'

	return (
		<div className='space-y-4 pb-10'>
			<div className='flex items-center justify-between gap-3'>
				<Link
					href='/dashboard/complaints'
					className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
				>
					<ArrowLeft className='size-4' />
					Volver a reclamos
				</Link>

				{canChangeStatus && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant='outline'
									size='sm'
									disabled={isPending}
									className='gap-1.5'
								>
									Cambiar estado
									<ChevronDown className='size-3.5' />
								</Button>
							}
						/>
						<DropdownMenuContent align='end'>
							{STATUS_CHANGE_OPTIONS.filter(
								(opt) => opt.value !== currentStatus,
							).map((opt) => (
								<DropdownMenuItem
									key={opt.value}
									onClick={() =>
										handleStatusChange(opt.value)
									}
								>
									{opt.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			<ComplaintHeader
				complaint={{ ...complaint, status: currentStatus }}
				deadline={deadline}
				resolvedAt={resolvedAt}
				hasResponse={Boolean(resolvedResponse)}
			/>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-start'>
				<div className='lg:col-span-2 space-y-4'>
					<ComplaintConsumerCard complaint={complaint} />
					<ComplaintDetailsCard
						complaint={complaint}
						attachments={attachments}
					/>
				</div>

				<div className='space-y-4 lg:sticky lg:top-4'>
					<ComplaintSolutionCard
						complaint={{ ...complaint, status: currentStatus }}
						resolvedResponse={resolvedResponse}
						resolvedAt={resolvedAt}
						respondedByName={respondedByName}
						isRespondable={isRespondable}
						onResponseSuccess={handleResponseSuccess}
					/>
					<ComplaintAuditCard
						history={historyEntries}
						auditHistory={auditHistory}
					/>
				</div>
			</div>
		</div>
	)
}
