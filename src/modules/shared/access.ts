import 'server-only'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { isOrganizationActive } from '@/modules/platform/status'
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

	// Corte de plataforma: una organización suspendida no puede ejecutar
	// acciones de tenant, aunque el usuario conserve sus permisos. Va antes
	// del chequeo de permisos para que el motivo del rechazo sea el correcto.
	const isActive = await isOrganizationActive(membership.organizationId)
	if (!isActive) {
		return { error: MESSAGES.platform.organizationSuspended }
	}

	if (!hasPermission(membership, permissionKey)) {
		return { error: permissionError }
	}

	return { session, membership }
}
