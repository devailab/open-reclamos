import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'

const DashboardPage: FC = async () => {
	const session = await getSession()

	return (
		<div className='space-y-4'>
			<div>
				<h1 className='text-2xl font-semibold'>Dashboard</h1>
				<p className='text-muted-foreground text-sm'>
					Bienvenido, {session?.user.name}
				</p>
			</div>
		</div>
	)
}

export default DashboardPage
