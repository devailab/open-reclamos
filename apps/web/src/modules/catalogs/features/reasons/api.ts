import {
	OpCreateReason,
	OpDeleteReason,
	OpListReasons,
	OpUpdateReason,
} from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'
import type { ReasonRow } from './types'

interface ReasonDTO {
	id: string
	reason: string
	parent_id: string | null
	organization_id: string | null
	created_at: string
	updated_at: string | null
}

export async function listReasons(signal?: AbortSignal): Promise<ReasonRow[]> {
	const rows: ReasonRow[] = []

	for (let page = 1; ; page++) {
		signal?.throwIfAborted()

		const result = await rpc<{ rows?: ReasonDTO[] | null; total: number }>(
			OpListReasons,
			{ page, pageSize: 100 },
			signal,
		)

		signal?.throwIfAborted()

		rows.push(
			...(result.rows ?? []).map((row) => ({
				id: row.id,
				reason: row.reason,
				parentId: row.parent_id,
				organizationId: row.organization_id,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			})),
		)

		if (rows.length >= result.total || (result.rows ?? []).length === 0) {
			return rows
		}
	}
}

async function save(input: {
	id?: string
	reason: string
	parentId?: string | null
}) {
	try {
		await rpc(input.id ? OpUpdateReason : OpCreateReason, {
			id: input.id,
			data: {
				reason: input.reason.trim(),
				parent_id: input.parentId ?? null,
			},
		})

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo guardar el motivo.',
		}
	}
}

export const createReason = save
export const updateReason = save

export async function deleteReason(id: string) {
	try {
		await rpc(OpDeleteReason, { id })

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo eliminar el motivo.',
		}
	}
}
