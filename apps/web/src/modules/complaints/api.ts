import {
	OpGetComplaint,
	OpGetDashboard,
	OpGetPublicBook,
	OpListCategories,
	OpListComplaints,
	OpListCountries,
	OpListFeatured,
	OpListStores,
	OpListUbigeos,
	OpRespond,
	OpSaveDraft,
	OpStartReview,
	OpSubmitComplaint,
	OpTrackComplaint,
	OpUpdateClassification,
} from '@open-reclamos/rpc-client'
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
import type { RPCMethod } from '@/shared/api/rpc'
import { rpc } from '@/shared/api/rpc'
import {
	complaintFilters,
	presentation,
	submissionData,
	tableRow,
	type WirePage,
	type WireRecord,
} from './adapters'
import type { ComplaintDetailPageProps } from './features/complaint-detail/types'
import type { FlatReason } from './features/public-book/reason-tree-field'
import type { CountryOption } from './features/public-book/step-consumer'
import type { ComplaintsTableFilters, DashboardTrendDays } from './filters'
import type {
	ComplaintCategorySummary,
	ComplaintsDashboardKpis,
	PublicHistoryEntry,
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

export interface PublicStore {
	id: string
	name: string
	slug: string
	type: string
	address: string | null
	addressType: string | null
	url: string | null
	formEnabled: boolean
}

export interface PublicOrganization {
	id: string
	slug: string
	name: string
	legalName: string
	taxId: string
	address: string
	addressType: string
	website: string | null
	logoKey: string | null
	formEnabled: boolean
	responseDeadlineDays: number
}

export async function getPublicBook(
	slug: string,
	kind: 'store' | 'organization',
	signal?: AbortSignal,
) {
	const [book, countries] = await Promise.all([
		rpc<{
			organization: WireRecord
			stores: WireRecord[] | null
			reasons: WireRecord[] | null
			turnstile_enabled: boolean
			turnstile_site_key: string
		}>(OpGetPublicBook, { id: slug, data: { kind } }, signal),
		catalog<CountryOption>(OpListCountries, signal),
	])

	return {
		organization: presentation<PublicOrganization>({
			address_type: '',
			website: null,
			...book.organization,
		}),
		stores: (book.stores ?? []).map((row) =>
			presentation<PublicStore>({ address_type: null, ...row }),
		),
		reasons: (book.reasons ?? []).map((row) =>
			presentation<FlatReason>(row),
		),
		countries,
		turnstileEnabled: book.turnstile_enabled,
		turnstileSiteKey: book.turnstile_site_key,
	}
}

export function submitComplaint(input: Record<string, unknown>) {
	return action(async () => {
		const data = submissionData(input)

		const result = await rpc<{
			tracking_code: string
			correlative: string
			response_deadline: string
		}>(OpSubmitComplaint, { data })

		return {
			trackingCode: result.tracking_code,
			correlative: result.correlative,
			responseDeadline: new Date(result.response_deadline),
		}
	})
}

export interface TrackingResult {
	id: string
	trackingCode: string
	correlative: string
	status: string
	type: string
	createdAt: Date
	responseDeadline: Date | null
	history: PublicHistoryEntry[]
}

export function trackComplaint(code: string, organizationSlug: string) {
	return action(async () => {
		const result = await rpc<{
			complaint: WireRecord
			history: WireRecord[] | null
		}>(OpTrackComplaint, {
			data: {
				organization_slug: organizationSlug,
				tracking_code: code.trim().toUpperCase(),
			},
		})

		return {
			...presentation<Omit<TrackingResult, 'history'>>(result.complaint),
			history: (result.history ?? []).map((row) =>
				presentation<PublicHistoryEntry>(row),
			),
		}
	})
}

export async function searchUbigeos(search: string) {
	const result = await rpc<WirePage>(OpListUbigeos, {
		filters: { search },
		pageSize: 100,
	})

	return (result.rows ?? []).map((row) => ({
		value: String(row.id),
		label: [row.district, row.province, row.department].join(', '),
	}))
}
