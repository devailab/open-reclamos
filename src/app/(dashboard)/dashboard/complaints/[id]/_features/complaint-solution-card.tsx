import { Lightbulb } from 'lucide-react'
import type { FC } from 'react'
import { formatDateTimeDisplay } from '@/lib/formatters'
import type { ComplaintDetail } from '@/modules/complaints/detail-queries'
import { ResponseForm } from './response-form'
import { Section } from './shared'

interface ComplaintSolutionCardProps {
	complaint: ComplaintDetail
	resolvedResponse: string | null
	resolvedAt: Date | null
	respondedByName: string | null
	isRespondable: boolean
	onResponseSuccess: (result: {
		response: string
		respondedAt: string
		respondedByName: string | null
		publicNote: string
	}) => void
}

export const ComplaintSolutionCard: FC<ComplaintSolutionCardProps> = ({
	complaint,
	resolvedResponse,
	resolvedAt,
	respondedByName,
	isRespondable,
	onResponseSuccess,
}) => {
	return (
		<Section icon={<Lightbulb className='size-4' />} title='Solución'>
			{resolvedResponse ? (
				<div className='space-y-3'>
					<p className='text-sm whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2'>
						{resolvedResponse}
					</p>
					<div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
						{resolvedAt && (
							<span>
								Respondido el{' '}
								{formatDateTimeDisplay(resolvedAt)}
							</span>
						)}
						{respondedByName && <span>por {respondedByName}</span>}
					</div>
				</div>
			) : isRespondable ? (
				<ResponseForm
					complaintId={complaint.id}
					initialDraft={complaint.draftResponse}
					onSuccess={onResponseSuccess}
				/>
			) : (
				<p className='text-sm text-muted-foreground'>
					Aún no se ha registrado una respuesta.
				</p>
			)}
		</Section>
	)
}
