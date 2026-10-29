import {
	OpGetPublicBook,
	OpListCountries,
	OpListUbigeos,
	OpSubmitComplaint,
	OpTrackComplaint,
} from '@open-reclamos/rpc-client'
import { publicRPC } from '@/shared/api/public-rpc'
import {
	presentation,
	submissionData,
	type WirePage,
	type WireRecord,
} from '../../adapters'
import type { PublicHistoryEntry } from '../../types'
import type { FlatReason } from './reason-tree-field'
import type { CountryOption } from './step-consumer'

async function action<T>(
	execute: () => Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
	try {
		return { success: true, data: await execute() }
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'No se pudo completar la operación. Intenta nuevamente.',
		}
	}
}

async function getCountries(signal?: AbortSignal): Promise<CountryOption[]> {
	const pageSize = 100
	const first = await publicRPC<WirePage>(
		OpListCountries,
		{ page: 1, pageSize },
		signal,
	)
	const pageCount = Math.ceil(first.total / pageSize)

	const remaining = await Promise.all(
		Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
			publicRPC<WirePage>(
				OpListCountries,
				{ page: index + 2, pageSize },
				signal,
			),
		),
	)

	return [first, ...remaining].flatMap((page) =>
		(page.rows ?? []).map((row) => presentation<CountryOption>(row)),
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
		publicRPC<{
			organization: WireRecord
			stores: WireRecord[] | null
			reasons: WireRecord[] | null
			turnstile_enabled: boolean
			turnstile_site_key: string
		}>(OpGetPublicBook, { id: slug, data: { kind } }, signal),
		getCountries(signal),
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

		const result = await publicRPC<{
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
		const result = await publicRPC<{
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
	const result = await publicRPC<WirePage>(OpListUbigeos, {
		filters: { search },
		pageSize: 100,
	})

	return (result.rows ?? []).map((row) => ({
		value: String(row.id),
		label: [row.district, row.province, row.department].join(', '),
	}))
}
