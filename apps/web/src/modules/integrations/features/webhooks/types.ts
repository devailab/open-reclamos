export interface WebhooksTableFilters {
	name: string
	status: 'all' | 'active' | 'inactive'
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

export interface WebhookEndpointRow {
	id: string
	name: string
	slug: string
	targetUrl: string
	events: string[]
	status: string
	timeoutMs: number
	createdAt: Date
	updatedAt: Date | null
	deletedAt: Date | null
}

export interface WebhookRecord {
	id: string
	name: string
	slug: string
	target_url: string
	events: string[]
	status: string
	timeout_ms: number
	created_at: string
}

export interface WebhookEndpointOption {
	id: string
	name: string
	status: string
}

export interface DeliveryRecord {
	id: string
	endpoint_id: string | null
	event_key: string
	status: string
	response_status: number | null
	error_message: string | null
	response_body: string | null
	request_body: unknown
	attempt_count: number
	created_at: string
	sent_at: string | null
}

export interface WebhookDeliveryRow {
	id: string
	endpointId: string | null
	endpointName: string | null
	endpointStatus: string | null
	eventKey: string
	status: string
	responseStatus: number | null
	errorMessage: string | null
	responseBody: string | null
	requestBody: unknown
	attemptCount: number
	createdAt: Date
	sentAt: Date | null
}

export interface WebhooksInitialState {
	rows: WebhookEndpointRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: WebhooksTableFilters
}

export interface DeliveriesInitialState {
	rows: WebhookDeliveryRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: DeliveriesTableFilters
	endpointOptions: WebhookEndpointOption[]
}

export interface WebhookFormValues {
	name: string
	targetUrl: string
	events: string[]
	status: string
	secret: string
	timeoutMs: number
}

export const INITIAL_WEBHOOK_FORM_VALUES: WebhookFormValues = {
	name: '',
	targetUrl: '',
	events: [],
	status: 'active',
	secret: '',
	timeoutMs: 15000,
}
