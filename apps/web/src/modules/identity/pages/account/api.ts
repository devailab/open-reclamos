import {
	OpChangePassword,
	OpCreateAPIKey,
	OpListAPIKeys,
	OpLogout,
	OpRevokeAPIKey,
	OpUpdateProfile,
} from '@open-reclamos/rpc-client'
import { isValid, parseISO } from 'date-fns'
import { rpc } from '@/shared/api/rpc'
import {
	listRecords,
	type Request,
	record,
	success,
	text,
} from '../../../../shared/api/responses'

export interface APIKeyDTO {
	id: string
	name: string
	created_at: string
	revoked_at: string | null
}

export function listAPIKeys(signal?: AbortSignal, request: Request = rpc) {
	return listRecords<APIKeyDTO>(
		OpListAPIKeys,
		(value) => {
			const data = record(value)
			const createdAt = text(data.created_at)

			if (
				!isValid(parseISO(createdAt)) ||
				(data.revoked_at != null &&
					(typeof data.revoked_at !== 'string' ||
						!isValid(parseISO(data.revoked_at))))
			) {
				throw new Error('Las fechas de la clave API no son válidas.')
			}

			return {
				id: text(data.id),
				name: text(data.name),
				created_at: createdAt,
				revoked_at: (data.revoked_at as string | null) ?? null,
			}
		},
		signal,
		request,
	)
}

export async function createAPIKey(
	name: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const data = record(
		await request(OpCreateAPIKey, { data: { name: name.trim() } }, signal),
	)

	signal?.throwIfAborted()

	return { id: text(data.id), api_key: text(data.api_key) }
}

export async function revokeAPIKey(
	id: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()
	success(await request(OpRevokeAPIKey, { id }, signal))
	signal?.throwIfAborted()
}

export async function updateProfile(
	name: string,
	lastName: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const data = record(
		await request(
			OpUpdateProfile,
			{ data: { name: name.trim(), last_name: lastName.trim() } },
			signal,
		),
	)

	signal?.throwIfAborted()

	return { id: text(data.id), name: text(data.name) }
}

export async function changePassword(
	currentPassword: string,
	newPassword: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	success(
		await request(
			OpChangePassword,
			{
				data: {
					current_password: currentPassword,
					new_password: newPassword,
				},
			},
			signal,
		),
	)

	signal?.throwIfAborted()
}

export async function logout(signal?: AbortSignal, request: Request = rpc) {
	signal?.throwIfAborted()
	success(await request(OpLogout, undefined, signal))
	signal?.throwIfAborted()
}
