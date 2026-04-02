import type { NextRequest } from 'next/server'
import { resolveApiKey, unauthorizedResponse } from '@/lib/api-auth'
import {
	getComplaintAttachments,
	getComplaintDetailById,
	getComplaintHistory,
} from '@/modules/complaints/detail-queries'

/**
 * GET /api/v1/complaints/:id
 *
 * Devuelve el detalle completo de un reclamo junto con su historial y
 * archivos adjuntos. El reclamo debe pertenecer a la organización del
 * usuario autenticado con el API key.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await resolveApiKey(request)
	if (!auth) return unauthorizedResponse()

	const { id } = await params

	const [complaint, history, attachments] = await Promise.all([
		getComplaintDetailById(id, auth.organizationId),
		getComplaintHistory(id, auth.organizationId),
		getComplaintAttachments(id),
	])

	if (!complaint) {
		return Response.json(
			{ error: 'Reclamo no encontrado.' },
			{ status: 404 },
		)
	}

	return Response.json({
		data: {
			id: complaint.id,
			correlative: complaint.correlative,
			trackingCode: complaint.trackingCode,
			type: complaint.type,
			status: complaint.status,
			organizationId: complaint.organizationId,
			store: {
				id: complaint.storeId,
				name: complaint.storeName,
			},
			reason: complaint.reasonLabel ?? null,
			consumer: {
				personType: complaint.personType,
				firstName: complaint.firstName,
				lastName: complaint.lastName,
				legalName: complaint.legalName,
				documentType: complaint.documentType,
				documentNumber: complaint.documentNumber,
				isMinor: complaint.isMinor,
				guardian: complaint.isMinor
					? {
							firstName: complaint.guardianFirstName,
							lastName: complaint.guardianLastName,
							documentType: complaint.guardianDocumentType,
							documentNumber: complaint.guardianDocumentNumber,
						}
					: null,
				email: complaint.email,
				dialCode: complaint.dialCode,
				phone: complaint.phone,
				address: complaint.address,
			},
			claim: {
				itemType: complaint.itemType,
				itemDescription: complaint.itemDescription,
				currency: complaint.currency,
				amount: complaint.amount,
				hasProofOfPayment: complaint.hasProofOfPayment,
				proofOfPaymentType: complaint.proofOfPaymentType,
				proofOfPaymentNumber: complaint.proofOfPaymentNumber,
				incidentDate: complaint.incidentDate,
				description: complaint.description,
				request: complaint.request,
			},
			response: {
				officialResponse: complaint.officialResponse,
				respondedAt: complaint.respondedAt,
				respondedBy: complaint.respondedByName,
			},
			delivery: {
				receipt: {
					status: complaint.receiptDeliveryStatus,
					sentAt: complaint.receiptDeliverySentAt,
				},
				response: {
					status: complaint.responseDeliveryStatus,
					sentAt: complaint.responseDeliverySentAt,
				},
			},
			deadline: {
				days: complaint.responseDeadlineDays,
				date: complaint.responseDeadline,
			},
			attachments: attachments.map((a) => ({
				id: a.id,
				fileName: a.fileName,
				contentType: a.contentType,
			})),
			history: history.map((h) => ({
				eventType: h.eventType,
				fromStatus: h.fromStatus,
				toStatus: h.toStatus,
				publicNote: h.publicNote,
				performedByRole: h.performedByRole,
				createdAt: h.createdAt,
			})),
			createdAt: complaint.createdAt,
			updatedAt: complaint.updatedAt,
		},
	})
}
