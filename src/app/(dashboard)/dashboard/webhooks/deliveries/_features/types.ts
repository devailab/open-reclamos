import type { WebhookDeliveryRow } from '@/modules/webhooks/queries'
import type { DeliveriesTableFilters } from '@/modules/webhooks/validation'

export type { WebhookDeliveryRow }

export interface DeliveriesInitialState {
	rows: WebhookDeliveryRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: DeliveriesTableFilters
	endpointOptions: { id: string; name: string }[]
}
