import {
	ALL_WEBHOOK_EVENTS,
	isWebhookEventKey,
	type WebhookEventKey,
} from '@/lib/webhook-events'

export const WEBHOOK_STATUS = ['active', 'inactive'] as const
export type WebhookStatus = (typeof WEBHOOK_STATUS)[number]

export const WEBHOOK_STATUS_FILTERS = ['all', 'active', 'inactive'] as const
export type WebhookStatusFilter = (typeof WEBHOOK_STATUS_FILTERS)[number]

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120
const MAX_URL_LENGTH = 2048

export interface WebhookMutationInput {
	name: string
	targetUrl: string
	events: string[]
	status: string
}

export interface NormalizedWebhookMutationInput {
	name: string
	targetUrl: string
	events: WebhookEventKey[]
	status: WebhookStatus
}

export interface WebhooksTableFilters {
	name: string
	status: WebhookStatusFilter
}

export interface DeliveriesTableFilters {
	endpointId: string
	status: string
}

export const DEFAULT_WEBHOOKS_TABLE_FILTERS: WebhooksTableFilters = {
	name: '',
	status: 'all',
}

export const DEFAULT_DELIVERIES_TABLE_FILTERS: DeliveriesTableFilters = {
	endpointId: 'all',
	status: 'all',
}

const isWebhookStatus = (value: string): value is WebhookStatus => {
	return WEBHOOK_STATUS.includes(value as WebhookStatus)
}

const isWebhookStatusFilter = (value: string): value is WebhookStatusFilter => {
	return WEBHOOK_STATUS_FILTERS.includes(value as WebhookStatusFilter)
}

export const normalizeWebhookMutationInput = (
	input: WebhookMutationInput,
): NormalizedWebhookMutationInput => {
	const events = (Array.isArray(input.events) ? input.events : [])
		.filter((e): e is WebhookEventKey => isWebhookEventKey(e))
		// dedup y ordenar igual que ALL_WEBHOOK_EVENTS para consistencia
		.filter((e, i, arr) => arr.indexOf(e) === i)
		.sort(
			(a, b) =>
				ALL_WEBHOOK_EVENTS.indexOf(a) - ALL_WEBHOOK_EVENTS.indexOf(b),
		)

	return {
		name: input.name.trim(),
		targetUrl: input.targetUrl.trim(),
		events,
		status: isWebhookStatus(input.status) ? input.status : 'active',
	}
}

export const validateWebhookMutationInput = (
	input: NormalizedWebhookMutationInput,
): string | null => {
	if (!input.name) return 'El nombre del webhook es requerido.'
	if (input.name.length < 3)
		return 'El nombre debe tener al menos 3 caracteres.'
	if (input.name.length > MAX_NAME_LENGTH)
		return 'El nombre no puede superar los 120 caracteres.'

	if (!input.targetUrl) return 'La URL de destino es requerida.'
	if (input.targetUrl.length > MAX_URL_LENGTH)
		return 'La URL de destino es demasiado larga.'

	try {
		const parsed = new URL(input.targetUrl)
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return 'La URL debe iniciar con http:// o https://.'
		}
	} catch {
		return 'La URL de destino no es válida.'
	}

	if (input.events.length === 0)
		return 'Debes seleccionar al menos un evento.'

	return null
}

export const validateWebhookId = (value: string): string | null => {
	if (!value || value.trim() === '') return 'El webhook es requerido.'
	if (!/^[0-9a-fA-F-]{36}$/.test(value.trim()))
		return 'El identificador de webhook no es válido.'
	return null
}

export const normalizeWebhooksTableFilters = (
	filters?: Partial<WebhooksTableFilters>,
): WebhooksTableFilters => {
	const normalizedName = (filters?.name ?? '')
		.trim()
		.slice(0, MAX_NAME_LENGTH)
	const requestedStatus = filters?.status
	const normalizedStatus = isWebhookStatusFilter(requestedStatus ?? '')
		? (requestedStatus ?? DEFAULT_WEBHOOKS_TABLE_FILTERS.status)
		: DEFAULT_WEBHOOKS_TABLE_FILTERS.status

	return { name: normalizedName, status: normalizedStatus }
}

export const normalizeWebhooksPagination = (
	page: number,
	pageSize: number,
): { page: number; pageSize: number } => {
	const normalizedPage =
		Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE
	const normalizedPageSize =
		Number.isFinite(pageSize) && pageSize > 0
			? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE)
			: DEFAULT_PAGE_SIZE
	return { page: normalizedPage, pageSize: normalizedPageSize }
}

export const normalizeDeliveriesTableFilters = (
	filters?: Partial<DeliveriesTableFilters>,
): DeliveriesTableFilters => {
	return {
		endpointId: filters?.endpointId?.trim() || 'all',
		status: filters?.status?.trim() || 'all',
	}
}
