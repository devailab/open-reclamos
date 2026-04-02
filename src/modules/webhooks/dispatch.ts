import { inngest } from '@/lib/inngest'
import type { WebhookEventKey } from '@/lib/webhook-events'

export const WEBHOOK_DELIVER_EVENT = 'webhook/deliver'

export interface WebhookDispatchPayload {
	organizationId: string
	eventKey: WebhookEventKey
	entityType: string
	entityId: string
	payload: Record<string, unknown>
}

/**
 * Dispara un evento Inngest para entregar un webhook a todos los endpoints
 * activos de la organización suscritos al eventKey dado.
 *
 * Llama a esta función desde acciones de reclamos (complaint.submitted, etc.)
 * luego de realizar los cambios en base de datos.
 */
export async function dispatchWebhookEvent(
	data: WebhookDispatchPayload,
): Promise<void> {
	await inngest.send({
		name: WEBHOOK_DELIVER_EVENT,
		data,
	})
}
