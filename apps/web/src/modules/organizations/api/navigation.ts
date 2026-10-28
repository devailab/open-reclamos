import { Code, ConnectError } from '@connectrpc/connect'
import {
	OpGetLoginOptions,
	OpSwitchOrganization,
} from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'

export async function switchOrganization(
	organization: { id: string; slug: string },
	authMethod: string,
	request: typeof rpc = rpc,
): Promise<{ requiresSSO: boolean; destination: string }> {
	const loginPath = `/login/${encodeURIComponent(organization.slug)}`

	try {
		const outcome = await request<{
			organization_id?: string
			requires_sso?: boolean
			login_mode?: string
		}>(OpSwitchOrganization, { id: organization.id })

		if (
			outcome?.requires_sso ||
			(!outcome?.organization_id &&
				outcome?.login_mode === 'sso_required')
		) {
			return { requiresSSO: true, destination: loginPath }
		}

		if (outcome?.organization_id !== organization.id) {
			throw new Error('No se pudo confirmar el cambio de organización.')
		}

		return { requiresSSO: false, destination: '/dashboard' }
	} catch (cause) {
		if (ConnectError.from(cause).code === Code.PermissionDenied) {
			try {
				const options = await request<{
					login_mode: string
					sso?: unknown
				}>(OpGetLoginOptions, { id: organization.slug })
				// La política mixta permite acceso local; tener un proveedor no implica exigir SSO.
				if (
					options?.login_mode === 'sso_required' ||
					(authMethod !== 'local' && options?.sso)
				) {
					return { requiresSSO: true, destination: loginPath }
				}
			} catch {
				// Si falla la consulta de política, se conserva el rechazo original.
			}
		}

		throw cause
	}
}
