import type { FC } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const DashboardLoading: FC = () => {
	return (
		<div className='space-y-4'>
			<div className='space-y-2'>
				<Skeleton className='h-7 w-40' />
				<Skeleton className='h-4 w-56' />
			</div>
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className='h-28 rounded-xl' />
				))}
			</div>
		</div>
	)
}

export default DashboardLoading
