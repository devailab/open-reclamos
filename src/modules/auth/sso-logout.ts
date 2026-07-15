import 'server-only'

import { and, eq } from 'drizzle-orm'
import { db } from '@/database/database'
import { accounts } from '@/database/schema'
import {
	SSO_CLIENT_ID,
	SSO_DISCOVERY_URL,
	SSO_ENABLED,
	SSO_PROVIDER_ID,
} from '@/lib/config'

interface OidcDiscoveryDocument {
	end_session_endpoint?: string
}

function getRequestOrigin(requestHeaders: Headers): string | null {
	const forwardedProto = requestHeaders.get('x-forwarded-proto')
	const forwardedHost = requestHeaders.get('x-forwarded-host')
	const host = forwardedHost ?? requestHeaders.get('host')

	if (!host) return null

	return `${forwardedProto ?? 'http'}://${host}`
}

async function getEndSessionEndpoint(): Promise<string | null> {
	try {
		const response = await fetch(SSO_DISCOVERY_URL, {
			cache: 'no-store',
		})

		if (!response.ok) {
			return null
		}

		const discovery =
			(await response.json()) satisfies OidcDiscoveryDocument

		if (!discovery.end_session_endpoint) {
			return null
		}

		return discovery.end_session_endpoint
	} catch {
		return null
	}
}

export async function buildSsoLogoutRedirectUrl(
	userId: string,
	requestHeaders: Headers,
): Promise<string | null> {
	if (!SSO_ENABLED) return null

	const origin = getRequestOrigin(requestHeaders)
	if (!origin) return null

	const endSessionEndpoint = await getEndSessionEndpoint()
	if (!endSessionEndpoint) return null

	const [account] = await db
		.select({
			idToken: accounts.idToken,
		})
		.from(accounts)
		.where(
			and(
				eq(accounts.userId, userId),
				eq(accounts.providerId, SSO_PROVIDER_ID),
			),
		)
		.limit(1)

	const logoutUrl = new URL(endSessionEndpoint)
	logoutUrl.searchParams.set(
		'post_logout_redirect_uri',
		`${origin}/auth/sso/logout/complete`,
	)

	if (account?.idToken) {
		logoutUrl.searchParams.set('id_token_hint', account.idToken)
	} else {
		logoutUrl.searchParams.set('client_id', SSO_CLIENT_ID)
	}

	return logoutUrl.toString()
}
