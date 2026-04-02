// Eventos de webhook: solo los eventos core de reclamos que se exponen externamente.
// A diferencia de audit_logs (exhaustivo), aquí solo van los eventos que el integrador necesita.
export const WEBHOOK_EVENT = {
	COMPLAINT_SUBMITTED: 'complaint.submitted',
	COMPLAINT_RESPONDED: 'complaint.responded',
	COMPLAINT_STATUS_CHANGED: 'complaint.status_changed',
} as const

export type WebhookEventKey = (typeof WEBHOOK_EVENT)[keyof typeof WEBHOOK_EVENT]

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventKey, string> = {
	'complaint.submitted': 'Reclamo enviado',
	'complaint.responded': 'Reclamo respondido',
	'complaint.status_changed': 'Estado de reclamo cambiado',
}

export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEventKey, string> = {
	'complaint.submitted':
		'Se envía cuando un consumidor registra un nuevo reclamo o queja.',
	'complaint.responded':
		'Se envía cuando la empresa registra una respuesta oficial al reclamo.',
	'complaint.status_changed':
		'Se envía cuando el estado del reclamo cambia (abierto, en proceso, cerrado, etc.).',
}

export const ALL_WEBHOOK_EVENTS: WebhookEventKey[] =
	Object.values(WEBHOOK_EVENT)

export const isWebhookEventKey = (value: string): value is WebhookEventKey => {
	return ALL_WEBHOOK_EVENTS.includes(value as WebhookEventKey)
}
