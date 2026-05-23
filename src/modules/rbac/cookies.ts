import { cookies } from 'next/headers'
import {
	ACTIVE_ORGANIZATION_COOKIE,
	ORGANIZATION_COOKIE_MAX_AGE,
} from './organization-selection'

const isSecureCookie = process.env.NODE_ENV === 'production'

function getCookieOptions() {
	return {
		httpOnly: true,
		maxAge: ORGANIZATION_COOKIE_MAX_AGE,
		path: '/',
		sameSite: 'lax' as const,
		secure: isSecureCookie,
	}
}

export async function getActiveOrganizationCookie() {
	const cookieStore = await cookies()
	return cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null
}

export async function setActiveOrganizationCookie(organizationId: string) {
	const cookieStore = await cookies()
	cookieStore.set(
		ACTIVE_ORGANIZATION_COOKIE,
		organizationId,
		getCookieOptions(),
	)
}

export async function clearActiveOrganizationCookie() {
	const cookieStore = await cookies()
	cookieStore.delete(ACTIVE_ORGANIZATION_COOKIE)
}
