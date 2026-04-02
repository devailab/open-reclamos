import type { WebhookEndpointRow } from '@/modules/webhooks/queries'
import type { WebhooksTableFilters } from '@/modules/webhooks/validation'

export type { WebhookEndpointRow }

export interface WebhooksInitialState {
	rows: WebhookEndpointRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: WebhooksTableFilters
}

export interface WebhookFormValues {
	name: string
	targetUrl: string
	events: string[]
	status: string
}

export const INITIAL_WEBHOOK_FORM_VALUES: WebhookFormValues = {
	name: '',
	targetUrl: '',
	events: [],
	status: 'active',
}
