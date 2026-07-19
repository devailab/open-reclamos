'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { type FC, useState } from 'react'
import type { ComplaintCategorySummary } from '@/modules/complaints/detail-queries'
import { ComplaintAuditCard } from './complaint-audit-card'
import { ComplaintConsumerCard } from './complaint-consumer-card'
import { ComplaintDetailsCard } from './complaint-details-card'
import { ComplaintHeader } from './complaint-header'
import { ComplaintSolutionCard } from './complaint-solution-card'
import { getDeadlineStatus } from './shared'
import type { ComplaintDetailPageProps } from './types'

export const ComplaintDetailPage: FC<ComplaintDetailPageProps> = ({
	complaint,
	auditHistory,
	history,
	attachments,
	availableCategories,
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
	const [currentPriority, setCurrentPriority] = useState(complaint.priority)
	const [currentCategory, setCurrentCategory] = useState(complaint.category)
	const [historyEntries, setHistoryEntries] = useState(history)

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
		priority: string
		category: ComplaintCategorySummary | null
	}) => {
		setResolvedResponse(result.response)
		setResolvedAt(new Date(result.respondedAt))
		setRespondedByName(result.respondedByName)
		setCurrentPriority(result.priority)
		setCurrentCategory(result.category)
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

	const handleClassificationSaved = (result: {
		priority: string
		category: ComplaintCategorySummary | null
	}) => {
		setCurrentPriority(result.priority)
		setCurrentCategory(result.category)
	}

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
			</div>

			<ComplaintHeader
				complaint={{
					...complaint,
					status: currentStatus,
					priority: currentPriority,
					category: currentCategory,
				}}
				deadline={deadline}
				resolvedAt={resolvedAt}
				hasResponse={Boolean(resolvedResponse)}
			/>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-start'>
				<div className='lg:col-span-2 space-y-4'>
					<ComplaintConsumerCard complaint={complaint} />
					<ComplaintDetailsCard
						complaint={{
							...complaint,
							priority: currentPriority,
							category: currentCategory,
						}}
						attachments={attachments}
					/>
				</div>

				<div className='space-y-4 lg:sticky lg:top-4'>
					<ComplaintSolutionCard
						complaint={{
							...complaint,
							status: currentStatus,
							priority: currentPriority,
							category: currentCategory,
						}}
						resolvedResponse={resolvedResponse}
						resolvedAt={resolvedAt}
						respondedByName={respondedByName}
						isRespondable={isRespondable}
						availableCategories={availableCategories}
						onClassificationSaved={handleClassificationSaved}
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
