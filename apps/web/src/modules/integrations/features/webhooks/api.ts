import {
	OpCreateWebhook,
	OpDeleteWebhook,
	OpListDeliveries,
	OpListWebhooks,
	OpRetryDelivery,
	OpUpdateWebhook,
} from '@open-reclamos/rpc-client'
import type { RPCMethod } from '@/shared/api/rpc'
import { rpc } from '@/shared/api/rpc'
import { ALL_WEBHOOK_EVENTS } from './events'
import {
	DEFAULT_DELIVERIES_TABLE_FILTERS,
	DEFAULT_WEBHOOKS_TABLE_FILTERS,
	type DeliveriesTableFilters,
	type DeliveryRecord,
	type WebhookDeliveryRow,
	type WebhookEndpointOption,
	type WebhookEndpointRow,
	type WebhookFormValues,
	type WebhookRecord,
	type WebhooksTableFilters,
} from './types'

interface Page<T> {
	rows: T[] | null
	total: number
	page: number
}

export function mapWebhook(row: WebhookRecord): WebhookEndpointRow {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		targetUrl: row.target_url,
		events: row.events ?? [],
		status: row.status,
		timeoutMs: row.timeout_ms,
		createdAt: new Date(row.created_at),
		updatedAt: null,
		deletedAt: null,
	}
}

export function mapDelivery(
	row: DeliveryRecord,
	endpoints: WebhookEndpointOption[],
): WebhookDeliveryRow {
	return {
		id: row.id,
		endpointId: row.endpoint_id,
		endpointName:
			endpoints.find((endpoint) => endpoint.id === row.endpoint_id)
				?.name ?? null,
		endpointStatus:
			endpoints.find((endpoint) => endpoint.id === row.endpoint_id)
				?.status ?? null,
		eventKey: row.event_key,
		status: row.status,
		responseStatus: row.response_status,
		errorMessage: row.error_message,
		responseBody: row.response_body,
		requestBody: row.request_body,
		attemptCount: row.attempt_count,
		createdAt: new Date(row.created_at),
		sentAt: row.sent_at ? new Date(row.sent_at) : null,
	}
}

export function webhookData(values: WebhookFormValues) {
	if (!values.name.trim() || values.name.trim().length > 120) {
		throw new Error(
			'El nombre es requerido y debe tener hasta 120 caracteres.',
		)
	}

	let url: URL

	try {
		url = new URL(values.targetUrl)
	} catch {
		throw new Error('El destino debe ser una URL HTTPS válida.')
	}

	if (url.protocol !== 'https:' || url.username || url.password) {
		throw new Error('El destino debe ser una URL HTTPS sin credenciales.')
	}

	if (
		!values.events.length ||
		values.events.some(
			(event) =>
				!ALL_WEBHOOK_EVENTS.includes(
					event as (typeof ALL_WEBHOOK_EVENTS)[number],
				),
		)
	) {
		throw new Error('Selecciona eventos válidos.')
	}

	if (values.status !== 'active' && values.status !== 'inactive') {
		throw new Error('Estado inválido.')
	}

	if (
		values.secret &&
		(values.secret.length < 16 || values.secret.length > 256)
	) {
		throw new Error('El secreto debe tener entre 16 y 256 caracteres.')
	}

	if (values.timeoutMs < 1000 || values.timeoutMs > 30000) {
		throw new Error('El tiempo de espera debe estar entre 1000 y 30000 ms.')
	}

	return {
		name: values.name.trim(),
		target_url: values.targetUrl.trim(),
		events: values.events,
		status: values.status,
		timeout_ms: values.timeoutMs,
		...(values.secret ? { secret: values.secret } : {}),
	}
}

export function deliveryFilters(filters: DeliveriesTableFilters) {
	return { endpoint_id: filters.endpointId, status: filters.status }
}

export async function getWebhooks(
	input: { page: number; pageSize: number; filters?: WebhooksTableFilters },
	signal?: AbortSignal,
) {
	const filters = input.filters ?? DEFAULT_WEBHOOKS_TABLE_FILTERS

	const result = await rpc<Page<WebhookRecord>>(
		OpListWebhooks,
		{
			page: input.page,
			pageSize: input.pageSize,
			filters: { name: filters.name, status: filters.status },
		},
		signal,
	)

	return {
		rows: (Array.isArray(result.rows) ? result.rows : []).map(mapWebhook),
		totalItems: result.total ?? 0,
		page: result.page ?? input.page,
	}
}

export async function getEndpointOptions(signal?: AbortSignal) {
	const endpoints: WebhookEndpointOption[] = []

	for (let page = 1; ; page++) {
		const result = await rpc<Page<WebhookRecord>>(
			OpListWebhooks,
			{ page, pageSize: 100 },
			signal,
		)

		endpoints.push(
			...(Array.isArray(result.rows) ? result.rows : []).map(
				({ id, name, status }) => ({ id, name, status }),
			),
		)

		if (
			endpoints.length >= (result.total ?? endpoints.length) ||
			!Array.isArray(result.rows) ||
			!result.rows.length
		) {
			return endpoints
		}
	}
}

export async function getDeliveries(
	input: { page: number; pageSize: number; filters?: DeliveriesTableFilters },
	signal?: AbortSignal,
) {
	const [result, endpoints] = await Promise.all([
		rpc<Page<DeliveryRecord>>(
			OpListDeliveries,
			{
				page: input.page,
				pageSize: input.pageSize,
				filters: deliveryFilters(
					input.filters ?? DEFAULT_DELIVERIES_TABLE_FILTERS,
				),
			},
			signal,
		),
		getEndpointOptions(signal),
	])

	return {
		rows: (Array.isArray(result.rows) ? result.rows : []).map((row) =>
			mapDelivery(row, endpoints),
		),
		totalItems: result.total ?? 0,
		page: result.page ?? input.page,
		endpointOptions: endpoints,
	}
}

async function mutate(
	method: RPCMethod,
	input: { id?: string; data?: Record<string, unknown> },
) {
	try {
		await rpc(method, input)

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo completar la operación.',
		}
	}
}

export async function saveWebhook(values: WebhookFormValues, id?: string) {
	try {
		if (!id && !values.secret) {
			throw new Error('El secreto de firma es requerido.')
		}

		return await mutate(id ? OpUpdateWebhook : OpCreateWebhook, {
			id,
			data: webhookData(values),
		})
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : 'Datos inválidos.',
		}
	}
}

export function deleteWebhook(id: string) {
	return mutate(OpDeleteWebhook, { id })
}

export async function retryDelivery(id: string, signal?: AbortSignal) {
	try {
		const result = await rpc<{ status: string }>(
			OpRetryDelivery,
			{ id },
			signal,
		)

		if (result.status !== 'queued') {
			throw new Error(
				'El servidor no confirmó el encolado del reintento.',
			)
		}

		return { status: 'queued' as const }
	} catch (error) {
		if (signal?.aborted) {
			throw error
		}

		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo encolar el reintento.',
		}
	}
}
