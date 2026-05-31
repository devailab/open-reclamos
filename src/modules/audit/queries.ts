import { and, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'
import { db } from '@/database/database'
import { organizationMembers, users } from '@/database/schema'
import { auditLogger } from '@/lib/audit-logger'
import type { AuditTableFilters } from './validation'

export interface AuditLogTableRow {
	id: string
	organizationId: string | null
	userId: string | null
	userName: string
	userEmail: string
	action: string
	entityType: string
	entityId: string | null
	oldData: unknown
	newData: unknown
	description: string | null
	ipAddress: string | null
	userAgent: string | null
	createdAt: Date
}

interface GetAuditLogsTableForOrganizationParams {
	organizationId: string
	page: number
	pageSize: number
	filters: AuditTableFilters
}

export interface AuditUserAutocompleteOption {
	value: string
	label: string
	userName: string
	userEmail: string
}

function toNullableFilter(value: string): string | null {
	return value.trim() === '' ? null : value.trim()
}

export async function getOrganizationForUser(userId: string) {
	const [membership] = await db
		.select({ organizationId: organizationMembers.organizationId })
		.from(organizationMembers)
		.where(eq(organizationMembers.userId, userId))
		.limit(1)

	return membership?.organizationId ?? null
}

export async function getAuditLogsTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: GetAuditLogsTableForOrganizationParams): Promise<{
	rows: AuditLogTableRow[]
	totalItems: number
}> {
	const result = await auditLogger.getPaginated({
		page,
		pageSize,
		filters: {
			organizationId,
			action: toNullableFilter(filters.action),
			entityType: toNullableFilter(filters.entityType),
			entityId: toNullableFilter(filters.entityId),
			userId: toNullableFilter(filters.userId),
			createdAtStart: filters.createdAtStart,
			createdAtEnd: filters.createdAtEnd,
		},
	})

	const userIds = [
		...new Set(
			result.items
				.map((item) => item.userId)
				.filter((id): id is string => id !== null && id !== undefined),
		),
	]

	const userMap = new Map<string, { name: string; email: string }>()

	if (userIds.length > 0) {
		const userRows = await db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(inArray(users.id, userIds))

		for (const user of userRows) {
			userMap.set(user.id, { name: user.name, email: user.email })
		}
	}

	const rows: AuditLogTableRow[] = result.items.map((item) => {
		const user = item.userId ? userMap.get(item.userId) : undefined
		return {
			id: item.id,
			organizationId: item.organizationId ?? null,
			userId: item.userId ?? null,
			userName: user?.name ?? 'Sistema',
			userEmail: user?.email ?? '—',
			action: item.action,
			entityType: item.entityType,
			entityId: item.entityId ?? null,
			oldData: item.oldData,
			newData: item.newData,
			description: item.description ?? null,
			ipAddress: item.ipAddress ?? null,
			userAgent: item.userAgent ?? null,
			createdAt: item.createdAt,
		}
	})

	return { rows, totalItems: result.total }
}

export async function searchAuditUsersForOrganization(
	organizationId: string,
	query: string,
): Promise<AuditUserAutocompleteOption[]> {
	const conditions: SQL<unknown>[] = [
		eq(organizationMembers.organizationId, organizationId),
	]

	if (query) {
		const searchTerm = `%${query}%`
		conditions.push(
			or(
				ilike(users.name, searchTerm),
				ilike(users.email, searchTerm),
			) as SQL<unknown>,
		)
	}

	const whereClause = and(...conditions)
	if (!whereClause) return []

	const rows = await db
		.select({
			value: users.id,
			userName: users.name,
			userEmail: users.email,
		})
		.from(organizationMembers)
		.innerJoin(users, eq(organizationMembers.userId, users.id))
		.where(whereClause)
		.orderBy(users.name)
		.limit(20)

	return rows.map((row) => ({
		value: row.value,
		label: `${row.userName} (${row.userEmail})`,
		userName: row.userName,
		userEmail: row.userEmail,
	}))
}
