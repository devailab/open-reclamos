'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canAccessSidebarPathname } from '@/lib/sidebar-navigation'
import { setActiveOrganizationCookie } from './cookies'
import { getMembershipContext } from './queries'

export async function $switchOrganizationAction(
	organizationId: string,
	currentPathname: string,
) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		redirect('/login')
	}

	const membership = await getMembershipContext(
		session.user.id,
		organizationId,
	)
	if (!membership) {
		redirect('/dashboard')
	}

	await setActiveOrganizationCookie(organizationId)

	if (canAccessSidebarPathname(currentPathname, membership.permissionKeys)) {
		redirect(currentPathname)
	}

	redirect('/dashboard')
}
