import { db } from '@/database/database'
import { auditLogs } from '@/database/schema'

export interface CreateAuditLogParams {
	organizationId: string
	userId?: string | null
	action: string
	entityType: string
	entityId?: string
	oldData?: Record<string, unknown> | null
	newData?: Record<string, unknown> | null
	ipAddress?: string | null
	userAgent?: string | null
}

/**
 * Registra una entrada en el log de auditoría.
 *
 * Esta función está optimizada para usarse dentro de transacciones existentes
 * o de forma independiente. No lanza errores que interrumpan el flujo
 * principal — los falla silenciosamente para no afectar la experiencia del
 * usuario, pero registra el error en consola para debugging.
 *
 * Ejemplo de uso:
 * ```ts
 * await createAuditLog({
 *   organizationId,
 *   userId: session.user.id,
 *   action: 'complaint.responded',
 *   entityType: 'complaint',
 *   entityId: complaintId,
 *   oldData: { status: 'open' },
 *   newData: { status: 'resolved', officialResponse: '...' },
 * })
 * ```
 */
export async function createAuditLog(
	params: CreateAuditLogParams,
): Promise<void> {
	try {
		await db.insert(auditLogs).values({
			organizationId: params.organizationId,
			userId: params.userId ?? null,
			action: params.action,
			entityType: params.entityType,
			entityId: params.entityId ?? null,
			oldData: params.oldData ?? null,
			newData: params.newData ?? null,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
		})
	} catch (error) {
		// El log de auditoría no debe bloquear la operación principal
		console.error('[audit] Error al registrar log de auditoría:', error)
	}
}
