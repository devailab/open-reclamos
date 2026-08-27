import type { NextRequest } from 'next/server'
import {
	apiAuthFailureResponse,
	forbiddenResponse,
	getAllowedStoreIds,
	resolveApiKey,
} from '@/lib/api-auth'
import {
	getComplaintAttachments,
	getComplaintDetailById,
	getComplaintHistory,
} from '@/modules/complaints/detail-queries'
import { hasPermission } from '@/modules/rbac/queries'

/**
 * GET /api/v1/complaints/:id
 *
 * Devuelve el detalle completo de un reclamo junto con su historial y
 * archivos adjuntos. Requiere el permiso `complaints.view`, el reclamo debe
 * pertenecer a la organización del API key y a una tienda accesible por el
 * miembro autenticado.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await resolveApiKey(request)
	if ('failure' in auth) return apiAuthFailureResponse(auth)

	if (!hasPermission(auth.membership, 'complaints.view')) {
		return forbiddenResponse(
			'El API key no tiene permiso para ver reclamos.',
		)
	}

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

	const allowedStoreIds = getAllowedStoreIds(auth.membership)
	if (
		allowedStoreIds !== undefined &&
		!allowedStoreIds.includes(complaint.storeId)
	) {
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
				legalTaxId: complaint.legalTaxId,
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
