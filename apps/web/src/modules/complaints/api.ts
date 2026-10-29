import {
	OpGetComplaint,
	OpGetDashboard,
	OpListCategories,
	OpListComplaints,
	OpListFeatured,
	OpListStores,
	OpRespond,
	OpSaveDraft,
	OpStartReview,
	OpUpdateClassification,
} from '@open-reclamos/rpc-client'
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
import type { RPCMethod } from '@/shared/api/rpc'
import { rpc } from '@/shared/api/rpc'
import {
	complaintFilters,
	presentation,
	tableRow,
	type WirePage,
	type WireRecord,
} from './adapters'
import type { ComplaintDetailPageProps } from './features/complaint-detail/types'
import type { ComplaintsTableFilters, DashboardTrendDays } from './filters'
import type {
	ComplaintCategorySummary,
	ComplaintsDashboardKpis,
	StoreOption,
} from './types'

export function errorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: 'No se pudo completar la operación. Intenta nuevamente.'
}

export async function getComplaintsTable(
	input: { page: number; pageSize: number; filters?: ComplaintsTableFilters },
	signal?: AbortSignal,
) {
	const result = await rpc<WirePage>(
		OpListComplaints,
		{
			page: input.page,
			pageSize: input.pageSize,
			filters: complaintFilters(input.filters),
		},
		signal,
	)

	return {
		rows: (result.rows ?? []).map(tableRow),
		totalItems: result.total,
		page: result.page,
	}
}

export const getComplaintsOverview = getComplaintsTable

export async function catalog<T>(
	method: RPCMethod,
	signal?: AbortSignal,
): Promise<T[]> {
	const result: T[] = []

	for (let page = 1; ; page++) {
		const batch = await rpc<WirePage>(
			method,
			{ page, pageSize: 100 },
			signal,
		)

		result.push(...(batch.rows ?? []).map((row) => presentation<T>(row)))

		if (result.length >= batch.total || !batch.rows?.length) {
			return result
		}
	}
}

export const getStores = (signal?: AbortSignal) =>
	catalog<StoreOption>(OpListStores, signal)

export const getCategories = (signal?: AbortSignal) =>
	catalog<ComplaintCategorySummary>(OpListCategories, signal)

export async function getComplaintsDashboardMetrics(
	{ days }: { days: DashboardTrendDays },
	signal?: AbortSignal,
) {
	const result = await rpc<{
		metrics: WireRecord
		trend: { day: string; total: number }[] | null
	}>(OpGetDashboard, { data: { trend_days: days } }, signal)

	const counts = new Map(
		(result.trend ?? []).map((point) => [
			point.day.slice(0, 10),
			Number(point.total),
		]),
	)

	const today = parseISO(
		new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(
			new Date(),
		),
	)

	return {
		days,
		kpis: presentation<ComplaintsDashboardKpis>(result.metrics),
		trend: eachDayOfInterval({
			start: subDays(today, days - 1),
			end: today,
		}).map((day) => {
			const date = format(day, 'yyyy-MM-dd')

			return { date, count: counts.get(date) ?? 0 }
		}),
	}
}

export async function getFeatured(signal?: AbortSignal) {
	const result = await rpc<WirePage>(OpListFeatured, { filters: {} }, signal)

	return (result.rows ?? []).map(tableRow)
}

interface WireDetail {
	complaint: WireRecord
	details: WireRecord | null
	store: WireRecord
	category: WireRecord | null
	reason: WireRecord | null
	history: WireRecord[] | null
	attachments: WireRecord[] | null
	audit_history: WireRecord[] | null
	deliveries: WireRecord | null
}

export async function getComplaint(
	id: string,
	signal?: AbortSignal,
): Promise<Omit<ComplaintDetailPageProps, 'availableCategories'>> {
	const result = await rpc<WireDetail>(OpGetComplaint, { id }, signal)
	const details = result.details ?? {}

	const complaint = presentation<ComplaintDetailPageProps['complaint']>({
		...result.complaint,
		draft_response: details.draft_response ?? null,
		official_response: details.official_response ?? null,
		responded_at: details.responded_at ?? null,
		responded_by_name: null,
		receipt_delivery_status: null,
		receipt_delivery_sent_at: null,
		receipt_delivery_error: null,
		response_delivery_status: null,
		response_delivery_sent_at: null,
		response_delivery_error: null,
		...result.deliveries,
		// El ID y las fechas pertenecen al reclamo, no a los registros auxiliares.
		id: result.complaint.id,
		created_at: result.complaint.created_at,
		updated_at: result.complaint.updated_at,
		store_name: result.store.name,
		reason_label: result.reason?.reason ?? null,
	})

	return {
		complaint: {
			...complaint,
			category: result.category
				? presentation<ComplaintCategorySummary>(result.category)
				: null,
		},
		history: (result.history ?? []).map((row) => presentation(row)),
		attachments: (result.attachments ?? []).map((row) => presentation(row)),
		auditHistory: (result.audit_history ?? []).map((row) =>
			presentation({ user_name: null, ...row }),
		),
	}
}

export const startReview = (id: string) => rpc(OpStartReview, { id })

async function action<T>(
	execute: () => Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
	try {
		return { success: true, data: await execute() }
	} catch (error) {
		return { success: false, error: errorMessage(error) }
	}
}

export function saveDraftResponse(id: string, draft: string) {
	return action(() =>
		rpc(OpSaveDraft, { id, data: { draft_response: draft } }),
	)
}

type ClassificationInput = {
	id: string
	priority: string
	categoryId: string | null
}

export function updateComplaintClassification(input: ClassificationInput) {
	return action(() =>
		rpc<{ success: true }>(OpUpdateClassification, {
			id: input.id,
			data: { priority: input.priority, category_id: input.categoryId },
		}),
	)
}

export function respondToComplaint(
	input: ClassificationInput & { response: string },
) {
	return action(() =>
		rpc<{ success: true }>(OpRespond, {
			id: input.id,
			data: {
				response: input.response,
				priority: input.priority,
				category_id: input.categoryId,
			},
		}),
	)
}
