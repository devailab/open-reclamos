import { format } from 'date-fns'
import type { ComplaintsTableFilters } from './filters'
import { DEFAULT_COMPLAINTS_TABLE_FILTERS } from './filters'
import type { ComplaintTableRow } from './types'

export type WireRecord = Record<string, unknown>

export interface WirePage {
	rows: WireRecord[] | null
	total: number
	page: number
	page_size: number
}

const dateKeys = new Set([
	'created_at',
	'updated_at',
	'incident_date',
	'response_deadline',
	'responded_at',
	'receipt_delivery_sent_at',
	'response_delivery_sent_at',
])

// Los DTO de presentación conservan la UI original sin acoplarla a SQLc/Drizzle.
export function presentation<T>(record: WireRecord): T {
	return Object.fromEntries(
		Object.entries(record).map(([key, value]) => [
			key.replace(/_([a-z])/g, (_, letter: string) =>
				letter.toUpperCase(),
			),
			dateKeys.has(key) && typeof value === 'string'
				? new Date(value)
				: value,
		]),
	) as T
}

export function complaintFilters(
	filters: ComplaintsTableFilters = DEFAULT_COMPLAINTS_TABLE_FILTERS,
): WireRecord {
	return {
		search: filters.search.trim(),
		store_id: filters.storeId === 'all' ? '' : filters.storeId,
		category_id: filters.categoryId === 'all' ? '' : filters.categoryId,
		status: filters.status === 'all' ? '' : filters.status,
		type: filters.type === 'all' ? '' : filters.type,
		sort: filters.sort,
		priority: filters.priority === 'all' ? '' : filters.priority,
		overdue: filters.overdue,
		active_only: filters.activeOnly,
		date_start: filters.dateStart,
		date_end: filters.dateEnd,
	}
}

export function tableRow(row: WireRecord): ComplaintTableRow {
	return {
		...presentation<ComplaintTableRow>(row),
		category:
			row.category_id && row.category_name
				? {
						id: String(row.category_id),
						name: String(row.category_name),
						description: null,
					}
				: null,
	}
}

export function submissionData(input: Record<string, unknown>): WireRecord {
	return Object.fromEntries(
		Object.entries(input).map(([key, value]) => [
			key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
			value instanceof Date
				? key === 'incidentDate'
					? `${format(value, 'yyyy-MM-dd')}T00:00:00-05:00`
					: value.toISOString()
				: value,
		]),
	)
}
