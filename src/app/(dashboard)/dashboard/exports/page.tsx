import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getStoreOptionsForOrganization } from '@/modules/complaints/dashboard-queries'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { ExportForm } from './_features/export-form'

const ExportsRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'exports.view')) redirect('/dashboard')

	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined

	const stores = await getStoreOptionsForOrganization(
		membership.organizationId,
		allowedStoreIds,
	)

	return (
		<div className='flex flex-col gap-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Exportar
				</h1>
				<p className='text-sm text-muted-foreground mt-1'>
					Descarga el registro de reclamos en PDF, CSV o Excel para
					auditorías y fiscalizaciones.
				</p>
			</div>

			<ExportForm stores={stores} />
		</div>
	)
}

export default ExportsRoute
