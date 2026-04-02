import { eq } from 'drizzle-orm'
import { db } from '@/database/database'
import { webhookDeliveries } from '@/database/schema'
import { inngest } from '@/lib/inngest'
import type { WebhookEventKey } from '@/lib/webhook-events'
import { WEBHOOK_DELIVER_EVENT, type WebhookDispatchPayload } from '../dispatch'
import { getActiveWebhooksByEventForOrganization } from '../queries'

const DEFAULT_TIMEOUT_MS = 15000

async function sendWebhookRequest(
	targetUrl: string,
	payload: Record<string, unknown>,
	timeoutMs: number,
): Promise<{ ok: boolean; status: number; body: string }> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(targetUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal,
		})

		const body = await response.text().catch(() => '')
		return { ok: response.ok, status: response.status, body }
	} finally {
		clearTimeout(timer)
	}
}

async function deliverToEndpoint(
	endpointId: string,
	targetUrl: string,
	timeoutMs: number | null,
	requestBody: Record<string, unknown>,
	organizationId: string,
	eventKey: string,
	entityType: string,
	entityId: string,
) {
	const [delivery] = await db
		.insert(webhookDeliveries)
		.values({
			organizationId,
			endpointId,
			eventKey,
			entityType,
			entityId,
			status: 'pending',
			requestBody,
		})
		.returning({ id: webhookDeliveries.id })

	const now = new Date()

	try {
		const result = await sendWebhookRequest(
			targetUrl,
			requestBody,
			timeoutMs ?? DEFAULT_TIMEOUT_MS,
		)

		await db
			.update(webhookDeliveries)
			.set({
				status: result.ok ? 'sent' : 'failed',
				attemptCount: 1,
				responseStatus: result.status,
				responseBody: result.body.slice(0, 4000),
				sentAt: result.ok ? now : null,
				updatedAt: now,
			})
			.where(eq(webhookDeliveries.id, delivery.id))

		return { endpointId, ok: result.ok, status: result.status }
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: 'Error desconocido al enviar webhook.'

		await db
			.update(webhookDeliveries)
			.set({
				status: 'failed',
				attemptCount: 1,
				errorMessage,
				updatedAt: now,
			})
			.where(eq(webhookDeliveries.id, delivery.id))

		return { endpointId, ok: false, errorMessage }
	}
}

export const deliverWebhook = inngest.createFunction(
	{
		id: 'webhooks-deliver',
		retries: 0,
		triggers: [{ event: WEBHOOK_DELIVER_EVENT }],
	},
	async ({ event, step }) => {
		const data = event.data as WebhookDispatchPayload

		const endpoints = await step.run('load-active-endpoints', () =>
			getActiveWebhooksByEventForOrganization(
				data.organizationId,
				data.eventKey as WebhookEventKey,
			),
		)

		if (endpoints.length === 0) {
			return { ok: true, skipped: 'no-matching-endpoints' }
		}

		const requestBody = {
			event: data.eventKey,
			entityType: data.entityType,
			entityId: data.entityId,
			organizationId: data.organizationId,
			payload: data.payload,
			timestamp: new Date().toISOString(),
		}

		const results = await Promise.allSettled(
			endpoints.map((endpoint) =>
				step.run(`deliver-${endpoint.id}`, () =>
					deliverToEndpoint(
						endpoint.id,
						endpoint.targetUrl,
						endpoint.timeoutMs,
						requestBody,
						data.organizationId,
						data.eventKey,
						data.entityType,
						data.entityId,
					),
				),
			),
		)

		const delivered = results.filter(
			(r) => r.status === 'fulfilled' && r.value.ok,
		).length

		return { ok: true, total: endpoints.length, delivered }
	},
)
