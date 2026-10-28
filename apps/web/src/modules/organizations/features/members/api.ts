import {
	OpCreateInvitation,
	OpGetUserAccess,
	OpListInvitations,
	OpListStores,
	OpListUsers,
	OpRemoveUser,
	OpRevokeInvitation,
	OpSendInvitationEmail,
	OpUpdateUserAccess,
} from '@open-reclamos/rpc-client'
import { sileo } from 'sileo'
import type { RPCMethod } from '@/shared/api/rpc'
import { rpc } from '@/shared/api/rpc'
import {
	type Access,
	type InvitationDTO,
	type InvitationRow,
	roleLabel,
	type StoreOption,
	type UserDTO,
	type UserRow,
	type UsersTableFilters,
} from './types'

interface Page<T> {
	rows?: T[] | null
	total: number
	page: number
}

export async function getUsersTable(input: {
	page: number
	pageSize: number
	filters?: UsersTableFilters
}): Promise<{ rows: UserRow[]; totalItems: number; page: number }> {
	const result = await rpc<Page<UserDTO>>(OpListUsers, {
		...input,
		filters: { ...input.filters },
	})

	const lastPage = Math.max(
		1,
		Math.ceil((result.total ?? 0) / input.pageSize),
	)

	if (input.page > lastPage) {
		return getUsersTable({ ...input, page: lastPage })
	}

	return {
		rows: (result.rows ?? []).map((row) => ({
			userId: row.id,
			name: [row.name, row.last_name].filter(Boolean).join(' '),
			email: row.email,
			role: row.role,
			roleName: roleLabel(row.role),
			storeAccessMode: row.store_access_mode,
			createdAt: row.created_at,
		})),
		totalItems: result.total ?? 0,
		page: result.page ?? input.page,
	}
}

export async function getInvitationsTable(input: {
	page: number
	pageSize: number
	filters?: UsersTableFilters
}): Promise<{ rows: InvitationRow[]; totalItems: number; page: number }> {
	const result = await rpc<Page<InvitationDTO>>(OpListInvitations, {
		...input,
		filters: { ...input.filters, status: 'pending' },
	})

	const lastPage = Math.max(
		1,
		Math.ceil((result.total ?? 0) / input.pageSize),
	)

	if (input.page > lastPage) {
		return getInvitationsTable({ ...input, page: lastPage })
	}

	return {
		rows: (result.rows ?? []).map((row) => ({
			id: row.id,
			email: row.email,
			roleName: roleLabel(row.role),
			storeAccessMode: row.store_access_mode,
			expiresAt: row.expires_at,
		})),
		totalItems: result.total ?? 0,
		page: result.page ?? input.page,
	}
}

export async function listStores(signal?: AbortSignal) {
	const rows: StoreOption[] = []

	for (let page = 1; ; page++) {
		signal?.throwIfAborted()

		const result = await rpc<Page<StoreOption>>(
			OpListStores,
			{ page, pageSize: 100, filters: { status: 'active' } },
			signal,
		)

		signal?.throwIfAborted()
		rows.push(...(result.rows ?? []))

		if (rows.length >= result.total || !(result.rows ?? []).length) {
			return rows
		}
	}
}

export async function getUserAccess(
	id: string,
	signal?: AbortSignal,
): Promise<Access> {
	const access = await rpc<
		Omit<Access, 'store_ids'> & { store_ids: string[] | null }
	>(OpGetUserAccess, { id }, signal)

	return { ...access, store_ids: access.store_ids ?? [] }
}

export const updateUserAccess = (id: string, data: Access) =>
	rpc(OpUpdateUserAccess, { id, data: { ...data } })

export const createInvitation = (data: Access & { email: string }) =>
	rpc<{ id: string; token: string; url: string }>(OpCreateInvitation, {
		data: { ...data },
	})

export async function sendInvitation(id: string, token?: string) {
	const result = await rpc<{
		status: 'sent' | 'skipped' | 'failed'
		url?: string
	}>(OpSendInvitationEmail, token ? { data: { token } } : { id })

	if (result.status === 'sent') {
		sileo.success({ title: 'Correo enviado' })
	} else if (result.status === 'skipped') {
		sileo.info({
			title: 'SMTP deshabilitado',
			description: 'Comparte el enlace de invitación manualmente.',
		})
	} else {
		sileo.warning({
			title: 'No se pudo enviar el correo',
			description: 'Puedes compartir el enlace generado manualmente.',
		})
	}

	return result
}

async function mutation(method: RPCMethod, id: string) {
	try {
		await rpc(method, { id })

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo completar la operación.',
		}
	}
}

export const removeUser = (id: string) => mutation(OpRemoveUser, id)
export const revokeInvitation = (id: string) => mutation(OpRevokeInvitation, id)
