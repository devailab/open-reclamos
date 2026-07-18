import { eq, sql } from 'drizzle-orm'
import { NonRetriableError } from 'inngest'
import { db } from '@/database/database'
import { webhookDeliveries } from '@/database/schema'
import { inngest } from '@/lib/inngest'
import type { WebhookEventKey } from '@/lib/webhook-events'
import { WEBHOOK_DELIVER_EVENT, type WebhookDispatchPayload } from '../dispatch'
import { getActiveWebhooksByEventForOrganization } from '../queries'
import { decryptWebhookSecret } from '../secret'
import { buildSignatureHeader, signWebhookPayload } from '../signature'
import { safeWebhookFetch, UnsafeWebhookUrlError } from '../ssrf'

const DEFAULT_TIMEOUT_MS = 15000
const MAX_RETRIES = 4

// Códigos 4xx que sí ameritan reintento
const RETRYABLE_CLIENT_STATUSES = new Set([408, 425, 429])

function isRetryableStatus(status: number): boolean {
	return status >= 500 || RETRYABLE_CLIENT_STATUSES.has(status)
}

class MissingWebhookSecretError extends Error {}

function buildSignedHeaders(
	deliveryId: string,
	secretEncrypted: string,
	rawBody: string,
): Record<string, string> {
	const timestamp = Math.floor(Date.now() / 1000)
	const secret = decryptWebhookSecret(secretEncrypted)
	const signature = signWebhookPayload(secret, timestamp, rawBody)

	return {
		'Content-Type': 'application/json',
		'X-Webhook-Timestamp': String(timestamp),
		'X-Webhook-Signature': buildSignatureHeader(signature),
		'X-Webhook-Id': deliveryId,
	}
}

async function sendWebhookRequest(
	targetUrl: string,
	headers: Record<string, string>,
	rawBody: string,
	timeoutMs: number,
): Promise<{ ok: boolean; status: number; body: string }> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await safeWebhookFetch(targetUrl, {
			method: 'POST',
			headers,
			body: rawBody,
			signal: controller.signal,
		})

		const body = await response.text().catch(() => '')
		return { ok: response.ok, status: response.status, body }
	} finally {
		clearTimeout(timer)
	}
}

async function createDeliveryRecord(
	endpointId: string,
	requestBody: Record<string, unknown>,
	organizationId: string,
	eventKey: string,
	entityType: string,
	entityId: string,
): Promise<string> {
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

	return delivery.id
}

interface DeliveryAttemptParams {
	deliveryId: string
	targetUrl: string
	timeoutMs: number | null
	requestBody: Record<string, unknown>
	secretEncrypted: string | null
	attempt: number
}

async function attemptDelivery({
	deliveryId,
	targetUrl,
	timeoutMs,
	requestBody,
	secretEncrypted,
	attempt,
}: DeliveryAttemptParams) {
	const now = new Date()
	const attemptCount = attempt + 1
	const hasRetriesLeft = attempt < MAX_RETRIES

	try {
		if (!secretEncrypted) {
			throw new MissingWebhookSecretError(
				'El endpoint no tiene un secreto de firma configurado.',
			)
		}

		// El body se serializa una única vez: la misma cadena se firma y se envía
		const rawBody = JSON.stringify(requestBody)
		const headers = buildSignedHeaders(deliveryId, secretEncrypted, rawBody)

		const result = await sendWebhookRequest(
			targetUrl,
			headers,
			rawBody,
			timeoutMs ?? DEFAULT_TIMEOUT_MS,
		)

		const willRetry = !result.ok && isRetryableStatus(result.status)

		await db
			.update(webhookDeliveries)
			.set({
				status: result.ok
					? 'sent'
					: willRetry && hasRetriesLeft
						? 'pending'
						: 'failed',
				attemptCount,
				responseStatus: result.status,
				responseBody: result.body.slice(0, 4000),
				sentAt: result.ok ? now : null,
				nextAttemptAt: null,
				updatedAt: now,
			})
			.where(eq(webhookDeliveries.id, deliveryId))

		if (result.ok) {
			return { ok: true, status: result.status }
		}

		if (willRetry) {
			// Lanzar hace que Inngest reintente este step con backoff + jitter
			throw new Error(
				`El endpoint respondió ${result.status}; se reintentará la entrega.`,
			)
		}

		// 4xx definitivo: no reintentar
		return { ok: false, status: result.status }
	} catch (error) {
		if (
			error instanceof UnsafeWebhookUrlError ||
			error instanceof MissingWebhookSecretError
		) {
			await db
				.update(webhookDeliveries)
				.set({
					status: 'failed',
					attemptCount,
					errorMessage: error.message,
					nextAttemptAt: null,
					updatedAt: now,
				})
				.where(eq(webhookDeliveries.id, deliveryId))

			throw new NonRetriableError(error.message)
		}

		const errorMessage =
			error instanceof Error
				? error.message
				: 'Error desconocido al enviar webhook.'

		await db
			.update(webhookDeliveries)
			.set({
				status: hasRetriesLeft ? 'pending' : 'failed',
				attemptCount: sql`greatest(${webhookDeliveries.attemptCount}, ${attemptCount})`,
				errorMessage,
				nextAttemptAt: null,
				updatedAt: now,
			})
			.where(eq(webhookDeliveries.id, deliveryId))

		throw error
	}
}

export const deliverWebhook = inngest.createFunction(
	{
		id: 'webhooks-deliver',
		retries: MAX_RETRIES,
		triggers: [{ event: WEBHOOK_DELIVER_EVENT }],
	},
	async ({ event, step, attempt }) => {
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

		// El registro de entrega se crea en un step memoizado: los reintentos
		// de la función reutilizan la misma fila en lugar de crear duplicados.
		const deliveryIds: Record<string, string> = {}
		for (const endpoint of endpoints) {
			deliveryIds[endpoint.id] = await step.run(
				`create-delivery-${endpoint.id}`,
				() =>
					createDeliveryRecord(
						endpoint.id,
						requestBody,
						data.organizationId,
						data.eventKey,
						data.entityType,
						data.entityId,
					),
			)
		}

		const results = await Promise.allSettled(
			endpoints.map((endpoint) =>
				step.run(`deliver-${endpoint.id}`, () =>
					attemptDelivery({
						deliveryId: deliveryIds[endpoint.id],
						targetUrl: endpoint.targetUrl,
						timeoutMs: endpoint.timeoutMs,
						requestBody,
						secretEncrypted: endpoint.secretEncrypted,
						attempt,
					}),
				),
			),
		)

		const failed = results.filter((r) => r.status === 'rejected')
		if (failed.length > 0) {
			// Propagar para que Inngest reintente los steps fallidos
			throw failed[0].reason
		}

		const delivered = results.filter(
			(r) => r.status === 'fulfilled' && r.value.ok,
		).length

		return { ok: true, total: endpoints.length, delivered }
	},
)
