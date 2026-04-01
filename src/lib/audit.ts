import 'server-only'

import { type DbTransaction, db } from '@/database/database'
import { auditLogs } from '@/database/schema'
import type { AuditLogAction } from '@/lib/audit-actions'

export { AUDIT_LOG, type AuditLogAction } from '@/lib/audit-actions'

export interface CreateAuditLogParams {
	organizationId?: string | null
	userId?: string | null
	action: AuditLogAction
	entityType: string
	entityId?: string
	oldData?: Record<string, unknown> | null
	newData?: Record<string, unknown> | null
	description?: string | null
	ipAddress?: string | null
	userAgent?: string | null
}

/**
 * Registra una entrada en el log de auditoría.
 *
 * Acepta opcionalmente una transacción activa (`tx`):
 * - Con `tx`: el insert forma parte de la transacción — si falla, propaga el
 *   error y provoca el rollback del bloque completo.
 * - Sin `tx`: comportamiento best-effort — el error se captura silenciosamente
 *   para no interrumpir el flujo principal.
 *
 * Ejemplo dentro de una transacción:
 * ```ts
 * await db.transaction(async (tx) => {
 *   await tx.update(complaints).set({ status: 'resolved' }).where(...)
 *   await createAuditLog({ action: 'complaint.responded', ... }, tx)
 * })
 * ```
 */
export async function createAuditLog(
	params: CreateAuditLogParams,
	tx?: DbTransaction,
): Promise<void> {
	const client = tx ?? db
	const values = {
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
	}

	if (tx) {
		// Dentro de transacción: propagar errores para hacer rollback
		await client.insert(auditLogs).values(values)
	} else {
		// Standalone: best-effort, no interrumpe el flujo principal
		try {
			await client.insert(auditLogs).values(values)
		} catch (error) {
			console.error('[audit] Error al registrar log de auditoría:', error)
		}
	}
}
