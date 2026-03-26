'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { type FC, useState } from 'react'
import type { ComplaintDetailPageProps } from './types'
import { ComplaintAuditCard } from './complaint-audit-card'
import { ComplaintConsumerCard } from './complaint-consumer-card'
import { ComplaintDetailsCard } from './complaint-details-card'
import { ComplaintHeader } from './complaint-header'
import { ComplaintSolutionCard } from './complaint-solution-card'
import { getDeadlineStatus } from './shared'

export const ComplaintDetailPage: FC<ComplaintDetailPageProps> = ({
	complaint,
	auditHistory,
}) => {
	const [resolvedResponse, setResolvedResponse] = useState<string | null>(
		complaint.officialResponse,
	)
	const [resolvedAt, setResolvedAt] = useState<Date | null>(
		complaint.respondedAt,
	)

	const isRespondable =
		!resolvedResponse &&
		(complaint.status === 'open' || complaint.status === 'in_progress')

	const deadline = getDeadlineStatus(
		complaint.responseDeadline,
		complaint.status,
	)

	const handleResponseSuccess = (response: string) => {
		setResolvedResponse(response)
		setResolvedAt(new Date())
	}

	return (
		<div className='space-y-4 pb-10'>
			<Link
				href='/dashboard/complaints'
				className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
			>
				<ArrowLeft className='size-4' />
				Volver a reclamos
			</Link>

			<ComplaintHeader
				complaint={complaint}
				deadline={deadline}
				resolvedAt={resolvedAt}
				hasResponse={Boolean(resolvedResponse)}
			/>
			
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-start'>
				<div className='lg:col-span-2 space-y-4'>
					<ComplaintConsumerCard complaint={complaint} />
					<ComplaintDetailsCard complaint={complaint} />
				</div>

				<div className='space-y-4 lg:sticky lg:top-4'>
					<ComplaintSolutionCard
						complaint={complaint}
						resolvedResponse={resolvedResponse}
						resolvedAt={resolvedAt}
						isRespondable={isRespondable}
						onResponseSuccess={handleResponseSuccess}
					/>
					<ComplaintAuditCard auditHistory={auditHistory} />
				</div>
			</div>
		</div>
	)
}
