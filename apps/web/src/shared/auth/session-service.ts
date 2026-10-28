import { Code, ConnectError } from '@connectrpc/connect'
import { OpGetOrganization, OpGetSession } from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'

export interface Organization {
	id: string
	name: string
	slug: string
	business_domain?: string | null
	role?: string
	status?: string
	logo_key?: string | null
	updated_at?: string
	[key: string]: unknown
}

export interface Session {
	user: {
		id: string
		name: string
		last_name: string
		email: string
		is_platform_admin: boolean
	}
	organization_id: string
	auth_method: string
	role?: string
	all_stores?: boolean
	store_ids?: string[]
	organization?: Organization
	capabilities?: Record<string, boolean>
}

export function isUnauthenticated(error: unknown): boolean {
	return ConnectError.from(error).code === Code.Unauthenticated
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error))
}

export async function loadSession(
	signal: AbortSignal,
	request: typeof rpc = rpc,
): Promise<{ session: Session | null; tenantError: Error | null }> {
	signal.throwIfAborted()

	let session: Session

	try {
		session = await request<Session>(OpGetSession, {}, signal)
	} catch (cause) {
		signal.throwIfAborted()

		if (isUnauthenticated(cause)) {
			return { session: null, tenantError: null }
		}

		throw cause
	}

	signal.throwIfAborted()

	if (!session?.user?.id) {
		throw new Error('La respuesta de sesión no es válida.')
	}

	if (!session.organization_id) {
		return { session, tenantError: null }
	}

	try {
		const organization = await request<Organization>(
			OpGetOrganization,
			{},
			signal,
		)

		signal.throwIfAborted()

		if (!organization || organization.id !== session.organization_id) {
			throw new Error('La respuesta de la empresa activa no es válida.')
		}

		return { session: { ...session, organization }, tenantError: null }
	} catch (cause) {
		signal.throwIfAborted()

		return { session, tenantError: asError(cause) }
	}
}
