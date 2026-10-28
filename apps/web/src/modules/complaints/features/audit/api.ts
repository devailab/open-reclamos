import { OpListAudit, OpListUsers } from '@open-reclamos/rpc-client'
import { format } from 'date-fns'
import { rpc } from '@/shared/api/rpc'
import type { AuditLogRow, AuditRecord } from './types'
import {
	type AuditTableFilters,
	createDefaultAuditTableFilters,
	validateAuditTableFilters,
} from './validation'

interface UserRecord {
	id: string
	name: string
	email: string
}

interface Page<T> {
	rows: T[] | null
	total: number
	page: number
}

export function auditFilters(filters: AuditTableFilters) {
	return {
		action: filters.action.trim(),
		entity_type: filters.entityType.trim(),
		entity_id: filters.entityId.trim(),
		user_id: filters.userId.trim(),
		date_start: format(filters.createdAtStart, 'yyyy-MM-dd'),
		date_end: format(filters.createdAtEnd, 'yyyy-MM-dd'),
	}
}

export function mapAudit(
	row: AuditRecord,
	users: UserRecord[] = [],
): AuditLogRow {
	const user = users.find((user) => user.id === row.user_id)

	return {
		id: row.id,
		organizationId: row.organization_id,
		userId: row.user_id,
		userName: user?.name ?? row.user_id ?? 'Sistema',
		userEmail: user?.email ?? '—',
		action: row.action,
		entityType: row.entity_type,
		entityId: row.entity_id,
		oldData: row.old_data,
		newData: row.new_data,
		description: row.description,
		ipAddress: row.ip_address,
		userAgent: row.user_agent,
		createdAt: new Date(row.created_at),
	}
}

async function getUsers(signal?: AbortSignal) {
	const users: UserRecord[] = []

	for (let page = 1; ; page++) {
		const result = await rpc<Page<UserRecord>>(
			OpListUsers,
			{ page, pageSize: 100 },
			signal,
		)

		users.push(...(Array.isArray(result.rows) ? result.rows : []))

		if (
			users.length >= (result.total ?? users.length) ||
			!Array.isArray(result.rows) ||
			!result.rows.length
		) {
			return users
		}
	}
}

export async function getAuditLogs(
	input: { page: number; pageSize: number; filters?: AuditTableFilters },
	signal?: AbortSignal,
) {
	const filters = input.filters ?? createDefaultAuditTableFilters()
	const error = validateAuditTableFilters(filters)

	if (error) {
		throw new Error(error)
	}

	const [result, users] = await Promise.all([
		rpc<Page<AuditRecord>>(
			OpListAudit,
			{
				page: input.page,
				pageSize: input.pageSize,
				filters: auditFilters(filters),
			},
			signal,
		),
		getUsers(signal),
	])

	return {
		rows: (Array.isArray(result.rows) ? result.rows : []).map((row) =>
			mapAudit(row, users),
		),
		totalItems: result.total ?? 0,
		page: result.page ?? input.page,
	}
}

export async function searchAuditUsers(query: string) {
	try {
		const users = await getUsers()
		const search = query.trim().toLocaleLowerCase()

		return {
			options: users
				.filter((user) =>
					`${user.name} ${user.email}`
						.toLocaleLowerCase()
						.includes(search),
				)
				.map((user) => ({
					value: user.id,
					label: `${user.name} (${user.email})`,
				})),
		}
	} catch (error) {
		return {
			options: [],
			error:
				error instanceof Error
					? error.message
					: 'No se pudo consultar usuarios.',
		}
	}
}
