import 'server-only'

import { count, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import {
	getActiveOrganizationCookie,
	setActiveOrganizationCookie,
} from '@/modules/rbac/cookies'
import { selectActiveOrganizationId } from '@/modules/rbac/organization-selection'
import { getUserOrganizationOptions } from '@/modules/rbac/queries'

export async function completeSsoSignIn(
	userId: string,
): Promise<'/setup' | '/dashboard'> {
	const reqHeaders = await headers()
	const [userRows, organizations, totalRows] = await Promise.all([
		db
			.select({
				email: users.email,
				setupStatus: users.setupStatus,
				isSuperAdmin: users.isSuperAdmin,
				emailVerified: users.emailVerified,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1),
		getUserOrganizationOptions(userId),
		db.select({ total: count() }).from(users),
	])
	const user = userRows[0]

	if (!user) return '/setup'

	// El IdP ya validó el correo: cuentas preexistentes también quedan verificadas
	if (!user.emailVerified) {
		await db
			.update(users)
			.set({ emailVerified: true })
			.where(eq(users.id, userId))
	}

	let destination: '/setup' | '/dashboard'
	if (user.setupStatus !== 'complete') {
		destination = '/setup'
	} else if (organizations.length === 0) {
		await db
			.update(users)
			.set({
				setupStatus: 'organization',
				isSuperAdmin: user.isSuperAdmin || totalRows[0]?.total === 1,
			})
			.where(eq(users.id, userId))
		destination = '/setup'
	} else {
		const activeOrganizationId = selectActiveOrganizationId(
			await getActiveOrganizationCookie(),
			organizations.map((organization) => organization.id),
		)
		if (activeOrganizationId) {
			await setActiveOrganizationCookie(activeOrganizationId)
		}
		destination = '/dashboard'
	}

	await createAuditLog({
		organizationId: organizations[0]?.id ?? null,
		userId,
		action: AUDIT_LOG.USER_LOGIN_SUCCESS,
		entityType: 'auth',
		entityId: userId,
		newData: {
			email: user.email,
			method: 'oidc',
			destination,
		},
		ipAddress:
			reqHeaders.get('x-forwarded-for') ?? reqHeaders.get('x-real-ip'),
		userAgent: reqHeaders.get('user-agent'),
	})

	return destination
}
