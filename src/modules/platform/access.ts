import 'server-only'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { isSuperAdminUser } from '@/modules/rbac/queries'
import type { SessionContext } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'

export type PlatformAccessContext =
	| { error: string }
	| { session: SessionContext }

/**
 * Guard del panel de plataforma. A diferencia de `requireAccess`, no exige
 * membresía en ninguna organización: el super admin opera por encima de los
 * tenants. Toda función de `@/modules/platform/queries` debe pasar por aquí
 * antes de leer datos cross-tenant.
 */
export async function requirePlatformAdmin(): Promise<PlatformAccessContext> {
	const session = await getSession()
	if (!session) redirect('/login')

	const isSuperAdmin = await isSuperAdminUser(session.user.id)
	if (!isSuperAdmin) {
		return { error: MESSAGES.platform.accessDenied }
	}

	return { session }
}

/**
 * Variante para Server Components: redirige al dashboard en lugar de
 * devolver un error, para que las páginas no tengan que ramificar.
 */
export async function requirePlatformAdminPage(): Promise<SessionContext> {
	const access = await requirePlatformAdmin()
	if ('error' in access) redirect('/dashboard')

	return access.session
}
