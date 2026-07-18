import 'server-only'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import {
	getMembershipContext,
	hasPermission,
	type MembershipContext,
} from '@/modules/rbac/queries'
import { MESSAGES } from './messages'

export type SessionContext = NonNullable<Awaited<ReturnType<typeof getSession>>>

export type AccessContext =
	| { error: string }
	| { session: SessionContext; membership: MembershipContext }

export async function requireAccess(
	permissionKey: string,
	permissionError: string = MESSAGES.common.permissionDenied,
): Promise<AccessContext> {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return { error: permissionError }
	}

	return { session, membership }
}
