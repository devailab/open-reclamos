import { OpAcceptInvitation, OpGetInvitation } from '@open-reclamos/rpc-client'
import { getSession } from '@/modules/identity/api'
import { hasTenantAccess } from '@/modules/identity/policy'
import type { InvitationDTO } from '@/modules/identity/types'
import { loginResult, type Request, record, text } from '@/shared/api/responses'
import { rpc } from '@/shared/api/rpc'

export async function getInvitation(
	token: string,
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<InvitationDTO> {
	signal?.throwIfAborted()

	const data = record(await request(OpGetInvitation, { id: token }, signal))

	signal?.throwIfAborted()

	const expiresAt = text(data.expires_at)

	if (
		!Number.isFinite(Date.parse(expiresAt)) ||
		Date.parse(expiresAt) <= Date.now()
	) {
		throw new Error('Esta invitación expiró.')
	}

	return {
		id: text(data.id),
		organization_name: text(data.organization_name),
		email: text(data.email),
		role: text(data.role),
		expires_at: expiresAt,
	}
}

export async function acceptInvitation(
	token: string,
	data: {
		email: string
		name: string
		lastName: string
		password: string
		documentType: string
		documentNumber: string
	},
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const userId = loginResult(
		await request(
			OpAcceptInvitation,
			{
				id: token,
				data: {
					email: data.email.trim().toLowerCase(),
					name: data.name.trim(),
					last_name: data.lastName.trim(),
					password: data.password,
					document_type: data.documentType,
					document_number: data.documentNumber.trim(),
				},
			},
			signal,
		),
	)

	signal?.throwIfAborted()

	const session = await getSession(signal, request)

	if (session.user.id !== userId || session.auth_method !== 'local') {
		throw new Error('No se pudo confirmar la sesión de la invitación.')
	}
	// Una invitación SSO requerida crea sesión local sin empresa: primero vincular en cuenta.
	return hasTenantAccess(session) ? '/dashboard' : '/dashboard/account'
}
