import { describe, expect, it } from 'bun:test'
import {
	complaintFilters,
	presentation,
	submissionData,
	tableRow,
} from './adapters'
import { DEFAULT_COMPLAINTS_TABLE_FILTERS } from './filters'
import type { ComplaintAuditEntry, ComplaintDetail } from './types'

describe('complaintFilters', () => {
	it('convierte todos los filtros al contrato snake_case sin enviar all como UUID', () => {
		expect(complaintFilters()).toEqual({
			search: '',
			store_id: '',
			category_id: '',
			status: '',
			type: '',
			sort: 'newest',
			priority: '',
			overdue: false,
			active_only: false,
			date_start: '',
			date_end: '',
		})
	})

	it('conserva tienda, categoría, rango de fechas y filtros de atención', () => {
		expect(
			complaintFilters({
				...DEFAULT_COMPLAINTS_TABLE_FILTERS,
				search: '  ABC  ',
				storeId: 'store-id',
				categoryId: 'category-id',
				status: 'in_review',
				type: 'claim',
				priority: 'urgent',
				activeOnly: true,
				overdue: true,
				dateStart: '2026-01-01',
				dateEnd: '2026-01-31',
			}),
		).toMatchObject({
			search: 'ABC',
			store_id: 'store-id',
			category_id: 'category-id',
			status: 'in_review',
			type: 'claim',
			priority: 'urgent',
			active_only: true,
			overdue: true,
			date_start: '2026-01-01',
			date_end: '2026-01-31',
		})
	})
})

describe('presentation', () => {
	it('hidrata fechas reales sin convertir decimales ni JSON de auditoría', () => {
		const result = presentation<ComplaintDetail & ComplaintAuditEntry>({
			amount: '12.50',
			created_at: '2026-01-02T12:00:00Z',
			responded_at: null,
			old_data: { category_id: 'previous' },
		})

		expect(result.createdAt).toEqual(new Date('2026-01-02T12:00:00Z'))
		expect(result.amount).toBe('12.50')
		expect(result.respondedAt).toBeNull()
		expect(result.oldData).toEqual({ category_id: 'previous' })
	})

	it('adapta la categoría plana de ListComplaints', () => {
		expect(
			tableRow({
				id: 'claim',
				category_id: 'category',
				category_name: 'Servicio',
			}).category,
		).toEqual({ id: 'category', name: 'Servicio', description: null })

		expect(
			tableRow({ id: 'claim', category_id: null, category_name: null })
				.category,
		).toBeNull()
	})
})

describe('submissionData', () => {
	it('envía slugs, fecha RFC3339, decimal string y tokens de upload exactos', () => {
		const files = [{ id: 'upload-id', token: 'upload-token' }]

		expect(
			submissionData({
				organizationSlug: 'company',
				storeSlug: 'store',
				incidentDate: new Date('2026-01-01T05:00:00Z'),
				amount: '10.20',
				hasProofOfPayment: false,
				isMinor: true,
				guardianFirstName: 'Ana',
				files,
			}),
		).toEqual({
			organization_slug: 'company',
			store_slug: 'store',
			incident_date: '2026-01-01T00:00:00-05:00',
			amount: '10.20',
			has_proof_of_payment: false,
			is_minor: true,
			guardian_first_name: 'Ana',
			files,
		})
	})
})
