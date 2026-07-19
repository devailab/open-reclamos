import type { FC } from 'react'
import { FeaturedComplaintCard } from '@/modules/complaints/components/featured-complaint-card'
import type { FeaturedComplaint } from '@/modules/complaints/dashboard-queries'

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
				<p className='mt-0.5 text-xs text-muted-foreground'>
					Los más urgentes según vencimiento y prioridad
				</p>
			</div>
			<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
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
