import { and, count, desc, eq, gte, ilike, lte, type SQL } from 'drizzle-orm'
import { db } from '@/database/database'
import { auditLogs, organizationMembers } from '@/database/schema'
import type { AuditTableFilters } from './validation'

export interface AuditLogTableRow {
	id: string
	organizationId: string | null
	userId: string | null
	action: string
	entityType: string
	entityId: string | null
	oldData: unknown
	newData: unknown
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

const buildAuditTableConditions = (
	organizationId: string,
	filters: AuditTableFilters,
): SQL<unknown>[] => {
	const conditions: SQL<unknown>[] = [
		eq(auditLogs.organizationId, organizationId),
		gte(auditLogs.createdAt, filters.createdAtStart),
		lte(auditLogs.createdAt, filters.createdAtEnd),
	]

	if (filters.action) {
		conditions.push(ilike(auditLogs.action, `%${filters.action}%`))
	}

	if (filters.entityType) {
		conditions.push(ilike(auditLogs.entityType, `%${filters.entityType}%`))
	}

	if (filters.entityId) {
		conditions.push(eq(auditLogs.entityId, filters.entityId))
	}

	return conditions
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
	const whereClause = and(
		...buildAuditTableConditions(organizationId, filters),
	)

	if (!whereClause) {
		return { rows: [], totalItems: 0 }
	}

	const offset = (page - 1) * pageSize

	const rows = await db
		.select({
			id: auditLogs.id,
			organizationId: auditLogs.organizationId,
			userId: auditLogs.userId,
			action: auditLogs.action,
			entityType: auditLogs.entityType,
			entityId: auditLogs.entityId,
			oldData: auditLogs.oldData,
			newData: auditLogs.newData,
			ipAddress: auditLogs.ipAddress,
			userAgent: auditLogs.userAgent,
			createdAt: auditLogs.createdAt,
		})
		.from(auditLogs)
		.where(whereClause)
		.orderBy(desc(auditLogs.createdAt))
		.limit(pageSize)
		.offset(offset)

	const [total] = await db
		.select({ total: count() })
		.from(auditLogs)
		.where(whereClause)

	return {
		rows,
		totalItems: total?.total ?? 0,
	}
}
