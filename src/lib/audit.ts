import 'server-only'

import type { AuditLogAction } from '@/lib/audit-actions'
import type { JsonValue } from '@/lib/audit-logger'
import { auditLogger } from '@/lib/audit-logger'

export { AUDIT_LOG, type AuditLogAction } from '@/lib/audit-actions'

export interface CreateAuditLogParams {
	organizationId?: string | null
	userId?: string | null
	action: AuditLogAction
	entityType: string
	entityId?: string | null
	oldData?: JsonValue | null
	newData?: JsonValue | null
	description?: string | null
	ipAddress?: string | null
	userAgent?: string | null
}

export async function createAuditLog(
	params: CreateAuditLogParams,
): Promise<void> {
	try {
		await auditLogger.insert({
			organizationId: params.organizationId ?? null,
			userId: params.userId ?? null,
			action: params.action,
			entityType: params.entityType,
			entityId: params.entityId ?? null,
			oldData: params.oldData ?? null,
			newData: params.newData ?? null,
			description: params.description ?? null,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
		})
	} catch (error) {
		console.error('[audit] Error al registrar log de auditoría:', error)
	}
}
