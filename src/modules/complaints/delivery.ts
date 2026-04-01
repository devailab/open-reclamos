import { and, eq } from 'drizzle-orm'
import { db } from '@/database/database'
import { complaints } from '@/database/schema'
import { sendEmail } from '@/lib/email'
import { inngest } from '@/lib/inngest'
import { renderComplaintReceiptPdfBuffer } from './components/complaint-receipt-pdf'
import {
	getComplaintAttachments,
	getComplaintDetailById,
} from './detail-queries'
import { createComplaintHistoryEntry } from './history'
import { getComplaintReceiptContext } from './queries'
import {
	buildComplaintReceiptEmailMessage,
	buildComplaintReceiptPdfInput,
	buildComplaintResponseEmailMessage,
	buildComplaintResponsePdfInput,
} from './receipt'

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type ComplaintDeliveryWorkflow = 'receipt' | 'response'
export type ComplaintDeliveryStatus =
	| 'queued'
	| 'processing'
	| 'sent'
	| 'failed'

export interface ComplaintDeliveryEventData {
	complaintId: string
	organizationId: string
}

export const COMPLAINT_RECEIPT_DELIVERY_EVENT =
	'app/complaints.receipt-delivery.requested'
export const COMPLAINT_RESPONSE_DELIVERY_EVENT =
	'app/complaints.response-delivery.requested'

function trimErrorMessage(value: string, maxLength = 1000) {
	if (value.length <= maxLength) return value
	return `${value.slice(0, maxLength - 3)}...`
}

function getTechnicalErrorMessage(error: unknown, fallback: string) {
	if (!(error instanceof Error) || !error.message.trim()) {
		return fallback
	}

	return trimErrorMessage(error.message.trim())
}

function getDeliveryFailureMessages(
	workflow: ComplaintDeliveryWorkflow,
	error: unknown,
) {
	const fallback =
		workflow === 'receipt'
			? 'No se pudo enviar la constancia del reclamo.'
			: 'No se pudo enviar el correo de respuesta del reclamo.'
	const technicalMessage = getTechnicalErrorMessage(error, fallback)

	return {
		technicalMessage,
		publicMessage:
			workflow === 'receipt'
				? 'Tuvimos un inconveniente al enviar la constancia por correo. Nuestro equipo lo revisará.'
				: 'Tuvimos un inconveniente al enviar la respuesta por correo. Nuestro equipo lo revisará.',
	}
}

function getComplaintDeliveryHistoryEntry(params: {
	workflow: ComplaintDeliveryWorkflow
	status: ComplaintDeliveryStatus
	failureMessage?: string | null
}) {
	const { workflow, status, failureMessage } = params

	if (workflow === 'receipt') {
		if (status === 'queued') {
			return {
				eventType: 'receipt_delivery_queued',
				publicNote:
					'Estamos preparando la constancia de tu reclamo para enviarla al correo registrado.',
			}
		}

		if (status === 'sent') {
			return {
				eventType: 'receipt_delivery_sent',
				publicNote:
					'La constancia de tu reclamo fue enviada al correo registrado.',
			}
		}

		if (status === 'failed') {
			return {
				eventType: 'receipt_delivery_failed',
				publicNote:
					'Tuvimos un inconveniente al enviar la constancia por correo. Nuestro equipo lo revisará.',
				internalNote: failureMessage ?? null,
			}
		}

		return null
	}

	if (status === 'queued') {
		return {
			eventType: 'response_delivery_queued',
			publicNote:
				'Estamos preparando el envío de la respuesta oficial al correo registrado.',
		}
	}

	if (status === 'sent') {
		return {
			eventType: 'response_delivery_sent',
			publicNote:
				'La respuesta oficial fue enviada al correo registrado.',
		}
	}

	if (status === 'failed') {
		return {
			eventType: 'response_delivery_failed',
			publicNote:
				'Tuvimos un inconveniente al enviar la respuesta por correo. Nuestro equipo lo revisará.',
			internalNote: failureMessage ?? null,
		}
	}

	return null
}

function getComplaintDeliveryUpdate(params: {
	workflow: ComplaintDeliveryWorkflow
	status: ComplaintDeliveryStatus
	failureMessage?: string | null
	at: Date
}) {
	const { workflow, status, failureMessage, at } = params

	if (workflow === 'receipt') {
		if (status === 'sent') {
			return {
				receiptDeliveryStatus: status,
				receiptDeliverySentAt: at,
				receiptDeliveryError: null,
			}
		}

		return {
			receiptDeliveryStatus: status,
			receiptDeliverySentAt: null,
			receiptDeliveryError:
				status === 'failed' ? (failureMessage ?? null) : null,
		}
	}

	if (status === 'sent') {
		return {
			responseDeliveryStatus: status,
			responseDeliverySentAt: at,
			responseDeliveryError: null,
		}
	}

	return {
		responseDeliveryStatus: status,
		responseDeliverySentAt: null,
		responseDeliveryError:
			status === 'failed' ? (failureMessage ?? null) : null,
	}
}

export async function setComplaintDeliveryStatus(
	params: {
		complaintId: string
		organizationId: string
		workflow: ComplaintDeliveryWorkflow
		status: ComplaintDeliveryStatus
		failureMessage?: string | null
		recordHistory?: boolean
	},
	tx?: DbOrTx,
) {
	const executor = tx ?? db
	const now = new Date()

	await executor
		.update(complaints)
		.set(
			getComplaintDeliveryUpdate({
				workflow: params.workflow,
				status: params.status,
				failureMessage: params.failureMessage,
				at: now,
			}),
		)
		.where(
			and(
				eq(complaints.id, params.complaintId),
				eq(complaints.organizationId, params.organizationId),
			),
		)

	if (params.recordHistory === false) return

	const historyEntry = getComplaintDeliveryHistoryEntry({
		workflow: params.workflow,
		status: params.status,
		failureMessage: params.failureMessage,
	})

	if (!historyEntry) return

	await createComplaintHistoryEntry(
		{
			complaintId: params.complaintId,
			eventType: historyEntry.eventType,
			publicNote: historyEntry.publicNote,
			internalNote: historyEntry.internalNote ?? null,
			performedByRole: 'system',
		},
		tx,
	)
}

export async function getComplaintDeliveryState(params: {
	complaintId: string
	organizationId: string
}) {
	const [row] = await db
		.select({
			id: complaints.id,
			receiptDeliveryStatus: complaints.receiptDeliveryStatus,
			responseDeliveryStatus: complaints.responseDeliveryStatus,
		})
		.from(complaints)
		.where(
			and(
				eq(complaints.id, params.complaintId),
				eq(complaints.organizationId, params.organizationId),
			),
		)
		.limit(1)

	return row ?? null
}

export async function enqueueComplaintReceiptDelivery(
	data: ComplaintDeliveryEventData,
) {
	return inngest.send({
		name: COMPLAINT_RECEIPT_DELIVERY_EVENT,
		data,
	})
}

export async function enqueueComplaintResponseDelivery(
	data: ComplaintDeliveryEventData,
) {
	return inngest.send({
		name: COMPLAINT_RESPONSE_DELIVERY_EVENT,
		data,
	})
}

async function getComplaintDeliveryPayload(params: ComplaintDeliveryEventData) {
	const complaint = await getComplaintDetailById(
		params.complaintId,
		params.organizationId,
	)

	if (!complaint) {
		throw new Error('Reclamo no encontrado para procesar el envío.')
	}

	const [receiptContext, attachments] = await Promise.all([
		getComplaintReceiptContext({
			organizationId: params.organizationId,
			storeId: complaint.storeId,
			reasonId: complaint.reasonId,
			consumerUbigeoId: complaint.ubigeoId,
		}),
		getComplaintAttachments(params.complaintId),
	])

	if (!receiptContext) {
		throw new Error('No se pudo preparar el contexto del PDF del reclamo.')
	}

	return {
		complaint,
		receiptContext,
		attachments,
	}
}

export async function sendComplaintReceiptDelivery(
	params: ComplaintDeliveryEventData,
) {
	const { complaint, receiptContext, attachments } =
		await getComplaintDeliveryPayload(params)

	const pdfInput = buildComplaintReceiptPdfInput({
		context: receiptContext,
		attachments: attachments.map((file) => ({
			fileName: file.fileName,
			contentType: file.contentType,
		})),
		complaint: {
			correlative: complaint.correlative,
			trackingCode: complaint.trackingCode,
			createdAt: complaint.createdAt,
			responseDeadline: complaint.responseDeadline ?? complaint.createdAt,
			personType: complaint.personType,
			documentType: complaint.documentType,
			documentNumber: complaint.documentNumber,
			firstName: complaint.firstName,
			lastName: complaint.lastName,
			legalName: complaint.legalName,
			guardianFirstName: complaint.guardianFirstName,
			guardianLastName: complaint.guardianLastName,
			guardianDocumentType: complaint.guardianDocumentType,
			guardianDocumentNumber: complaint.guardianDocumentNumber,
			email: complaint.email,
			dialCode: complaint.dialCode,
			phone: complaint.phone,
			address: complaint.address,
			type: complaint.type,
			itemType: complaint.itemType,
			itemDescription: complaint.itemDescription,
			currency: complaint.currency,
			amount: complaint.amount,
			hasProofOfPayment: complaint.hasProofOfPayment ?? false,
			proofOfPaymentType: complaint.proofOfPaymentType,
			proofOfPaymentNumber: complaint.proofOfPaymentNumber,
			incidentDate: complaint.incidentDate,
			description: complaint.description,
			request: complaint.request,
		},
	})

	const pdfBuffer = await renderComplaintReceiptPdfBuffer(pdfInput)
	const emailMessage = buildComplaintReceiptEmailMessage({
		pdf: pdfInput,
	})

	await sendEmail({
		to: complaint.email,
		subject: emailMessage.subject,
		text: emailMessage.text,
		html: emailMessage.html,
		attachments: [
			{
				filename: emailMessage.fileName,
				content: pdfBuffer,
				contentType: 'application/pdf',
			},
		],
	})
}

export async function sendComplaintResponseDelivery(
	params: ComplaintDeliveryEventData,
) {
	const { complaint, receiptContext, attachments } =
		await getComplaintDeliveryPayload(params)

	if (!complaint.officialResponse || !complaint.respondedAt) {
		throw new Error(
			'El reclamo aún no tiene una respuesta oficial lista para enviar.',
		)
	}

	const pdfInput = buildComplaintResponsePdfInput({
		context: receiptContext,
		attachments: attachments.map((file) => ({
			fileName: file.fileName,
			contentType: file.contentType,
		})),
		complaint: {
			correlative: complaint.correlative,
			trackingCode: complaint.trackingCode,
			createdAt: complaint.createdAt,
			responseDeadline:
				complaint.responseDeadline ?? complaint.respondedAt,
			personType: complaint.personType,
			documentType: complaint.documentType,
			documentNumber: complaint.documentNumber,
			firstName: complaint.firstName,
			lastName: complaint.lastName,
			legalName: complaint.legalName,
			guardianFirstName: complaint.guardianFirstName,
			guardianLastName: complaint.guardianLastName,
			guardianDocumentType: complaint.guardianDocumentType,
			guardianDocumentNumber: complaint.guardianDocumentNumber,
			email: complaint.email,
			dialCode: complaint.dialCode,
			phone: complaint.phone,
			address: complaint.address,
			type: complaint.type,
			itemType: complaint.itemType,
			itemDescription: complaint.itemDescription,
			currency: complaint.currency,
			amount: complaint.amount,
			hasProofOfPayment: complaint.hasProofOfPayment ?? false,
			proofOfPaymentType: complaint.proofOfPaymentType,
			proofOfPaymentNumber: complaint.proofOfPaymentNumber,
			incidentDate: complaint.incidentDate,
			description: complaint.description,
			request: complaint.request,
			officialResponse: complaint.officialResponse,
			respondedAt: complaint.respondedAt,
		},
	})

	const pdfBuffer = await renderComplaintReceiptPdfBuffer(pdfInput)
	const emailMessage = buildComplaintResponseEmailMessage({
		pdf: pdfInput,
		response: complaint.officialResponse,
		respondedAt: complaint.respondedAt,
	})

	await sendEmail({
		to: complaint.email,
		subject: emailMessage.subject,
		text: emailMessage.text,
		html: emailMessage.html,
		attachments: [
			{
				filename: emailMessage.fileName,
				content: pdfBuffer,
				contentType: 'application/pdf',
			},
		],
	})
}

export function getComplaintDeliveryFailure(params: {
	workflow: ComplaintDeliveryWorkflow
	error: unknown
}) {
	return getDeliveryFailureMessages(params.workflow, params.error)
}
