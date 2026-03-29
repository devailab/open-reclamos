import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	getOrganizationSettingsForUser,
	getUbigeoById,
} from '@/modules/settings/queries'
import { OrganizationSettingsForm } from './_features/organization-settings-form'

const SettingsPage: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'settings.view')) redirect('/dashboard')

	const org = await getOrganizationSettingsForUser(session.user.id)
	if (!org) redirect('/setup')

	const currentUbigeo = await getUbigeoById(org.ubigeoId)

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Configuración</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Administra la información general de tu empresa.
				</p>
			</div>

			<OrganizationSettingsForm
				org={org}
				currentUbigeoOption={
					currentUbigeo
						? {
								value: currentUbigeo.id,
								label: currentUbigeo.label,
							}
						: null
				}
				canManage={hasPermission(membership, 'settings.manage')}
			/>
		</div>
	)
}

export default SettingsPage
