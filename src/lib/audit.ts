import { type DbTransaction, db } from '@/database/database'
import { auditLogs } from '@/database/schema'

export const AUDIT_LOG = {
	COMPLAINT_SUBMITTED: 'complaint.submitted',
	COMPLAINT_RESPONDED: 'complaint.responded',
	COMPLAINT_STATUS_CHANGED: 'complaint.status_changed',
	COMPLAINT_TRACKING_VIEWED: 'complaint.tracking_viewed',
	COMPLAINT_RECEIPT_DELIVERY_FAILED: 'complaint.receipt_delivery_failed',
	COMPLAINT_RESPONSE_DELIVERY_FAILED: 'complaint.response_delivery_failed',
	USER_INVITED: 'user.invited',
	USER_ACCESS_UPDATED: 'user.access_updated',
	USER_REMOVED: 'user.removed',
	USER_LOGIN_SUCCESS: 'user.login_success',
	USER_LOGIN_FAILED: 'user.login_failed',
	USER_JOINED_ORGANIZATION: 'user.joined_organization',
	INVITATION_REVOKED: 'invitation.revoked',
	INVITATION_ACCEPTED: 'invitation.accepted',
	ROLE_CREATED: 'role.created',
	ROLE_UPDATED: 'role.updated',
	ROLE_DELETED: 'role.deleted',
	PERMISSION_CREATED: 'permission.created',
	PERMISSION_UPDATED: 'permission.updated',
	PERMISSION_DELETED: 'permission.deleted',
	STORE_CREATED: 'store.created',
	STORE_UPDATED: 'store.updated',
	STORE_DEACTIVATED: 'store.deactivated',
	STORE_FORM_ENABLED: 'store.form_enabled',
	STORE_FORM_DISABLED: 'store.form_disabled',
	ORGANIZATION_CREATED: 'organization.created',
	ORGANIZATION_UPDATED: 'organization.updated',
	ORGANIZATION_FORM_ENABLED: 'organization.form_enabled',
	ORGANIZATION_FORM_DISABLED: 'organization.form_disabled',
	ORGANIZATION_TEST_EMAIL_SENT: 'organization.test_email.sent',
} as const

export type AuditLogAction = (typeof AUDIT_LOG)[keyof typeof AUDIT_LOG]

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
