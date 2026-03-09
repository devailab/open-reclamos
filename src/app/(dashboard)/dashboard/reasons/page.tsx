import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getOrganizationForUser,
	getReasonsForOrg,
} from '@/modules/reasons/queries'
import { ReasonsPage } from './_features/reasons-page'

const ReasonsRoute: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const reasons = await getReasonsForOrg(organizationId)

	return <ReasonsPage reasons={reasons} />
}

export default ReasonsRoute
