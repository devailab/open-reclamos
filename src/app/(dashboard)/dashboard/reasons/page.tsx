import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { getReasonsForOrg } from '@/modules/reasons/queries'
import { ReasonsPage } from './_features/reasons-page'

const ReasonsRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'reasons.view')) redirect('/dashboard')

	const reasons = await getReasonsForOrg(membership.organizationId)

	return <ReasonsPage reasons={reasons} />
}

export default ReasonsRoute
