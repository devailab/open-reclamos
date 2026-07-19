import { Store } from 'lucide-react'
import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getStoreOptionsForOrganization } from '@/modules/complaints/dashboard-queries'
import { buildComplaintsStorePath } from '@/modules/complaints/routes'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'

const ComplaintsRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'complaints.view')) redirect('/dashboard')

	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined

	const stores = await getStoreOptionsForOrganization(
		membership.organizationId,
		allowedStoreIds,
	)

	if (stores.length > 0) {
		redirect(buildComplaintsStorePath(stores[0].id))
	}

	return (
		<div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center'>
			<div className='flex size-12 items-center justify-center rounded-full bg-muted'>
				<Store className='size-6 text-muted-foreground' />
			</div>
			<div className='space-y-1'>
				<h1 className='text-lg font-semibold'>
					Sin tiendas disponibles
				</h1>
				<p className='text-sm text-muted-foreground'>
					No tienes tiendas asignadas para consultar reclamos.
				</p>
			</div>
		</div>
	)
}

export default ComplaintsRoute
