import { MsgDenied } from '@open-reclamos/rpc-client'
import { redirect } from 'react-router'
import { contextSignal } from './context'
import { sessionStore } from './session-store'

export async function requireOrganization(request: Request) {
	request.signal.throwIfAborted()

	const result = await sessionStore.ensure()

	request.signal.throwIfAborted()

	if (result.error) {
		throw result.error
	}

	if (!result.session) {
		const url = new URL(request.url)

		throw redirect(
			`/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`,
		)
	}

	if (result.tenantError) {
		throw result.tenantError
	}
	if (!result.session.organization_id) {
		throw redirect('/setup')
	}
	if (!result.session.organization) {
		throw new Error(MsgDenied)
	}

	return {
		session: result.session,
		signal: AbortSignal.any([request.signal, contextSignal()]),
	}
}
