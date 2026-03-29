'use server'

import { addDays } from 'date-fns'
import { headers } from 'next/headers'
import { db } from '@/database/database'
import { complaintAttachments, complaints } from '@/database/schema'
import { createAuditLog } from '@/lib/audit'
import { generateTrackingCode } from './lib'
import { getNextCorrelative } from './queries'

const RESPONSE_DEADLINE_DAYS = 15

export interface UploadedFileInput {
	key: string
	fileName: string
	contentType: string
}

export interface SubmitComplaintInput {
	organizationId: string
	storeId: string
	// Consumer
	personType: string
	documentType: string
	documentNumber: string
	firstName: string
	lastName: string
	legalName: string | null
	isMinor: boolean
	guardianFirstName: string | null
	guardianLastName: string | null
	guardianDocumentType: string | null
	guardianDocumentNumber: string | null
	email: string
	dialCode: string | null
	phone: string | null
	ubigeoId: string | null
	address: string | null
	// Complaint details
	type: string
	itemType: string | null
	itemDescription: string | null
	currency: string | null
	amount: string | null
	hasProofOfPayment: boolean
	proofOfPaymentType: string | null
	proofOfPaymentNumber: string | null
	reasonId: string | null
	incidentDate: Date | null
	description: string | null
	request: string | null
	// Files
	files: UploadedFileInput[]
}

export interface SubmitComplaintResult {
	success: boolean
	data?: {
		trackingCode: string
		correlative: string
		responseDeadline: Date
	}
	error?: string
}

export async function $submitComplaintAction(
	input: SubmitComplaintInput,
): Promise<SubmitComplaintResult> {
	// Basic server-side validation
	if (!input.storeId || !input.organizationId) {
		return { success: false, error: 'Datos de tienda inválidos.' }
	}
	if (!input.email || !input.documentNumber) {
		return { success: false, error: 'Datos del reclamante incompletos.' }
	}
	if (!input.type) {
		return { success: false, error: 'Tipo de reclamo requerido.' }
	}

	try {
		const trackingCode = generateTrackingCode()
		const correlative = await getNextCorrelative(input.storeId)
		const now = new Date()
		const responseDeadline = addDays(now, RESPONSE_DEADLINE_DAYS)

		const reqHeaders = await headers()
		await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(complaints)
				.values({
					organizationId: input.organizationId,
					storeId: input.storeId,
					reasonId: input.reasonId ?? null,
					ubigeoId: input.ubigeoId ?? null,
					status: 'open',
					trackingCode,
					correlative,
					personType: input.personType,
					firstName: input.firstName,
					lastName: input.lastName,
					documentType: input.documentType,
					documentNumber: input.documentNumber,
					legalName: input.legalName ?? null,
					isMinor: input.isMinor,
					guardianFirstName: input.guardianFirstName ?? null,
					guardianLastName: input.guardianLastName ?? null,
					guardianDocumentType: input.guardianDocumentType ?? null,
					guardianDocumentNumber:
						input.guardianDocumentNumber ?? null,
					email: input.email,
					dialCode: input.dialCode ?? null,
					phone: input.phone ?? null,
					address: input.address ?? null,
					type: input.type,
					itemType: input.itemType ?? null,
					itemDescription: input.itemDescription ?? null,
					currency: input.currency ?? null,
					amount: input.amount ?? null,
					hasProofOfPayment: input.hasProofOfPayment,
					proofOfPaymentType: input.proofOfPaymentType ?? null,
					proofOfPaymentNumber: input.proofOfPaymentNumber ?? null,
					incidentDate: input.incidentDate ?? null,
					responseDeadlineDays: RESPONSE_DEADLINE_DAYS,
					responseDeadline,
					description: input.description ?? null,
					request: input.request ?? null,
				})
				.returning({ id: complaints.id })

			if (!inserted?.id) throw new Error('insert failed')

			if (input.files.length > 0) {
				await tx.insert(complaintAttachments).values(
					input.files.map((f) => ({
						complaintId: inserted.id,
						storageKey: f.key,
						fileName: f.fileName,
						contentType: f.contentType,
					})),
				)
			}

			await createAuditLog(
				{
					organizationId: input.organizationId,
					action: 'complaint.created',
					entityType: 'complaint',
					entityId: inserted.id,
					newData: {
						correlative,
						trackingCode,
						type: input.type,
						status: 'open',
						storeId: input.storeId,
					},
					ipAddress:
						reqHeaders.get('x-forwarded-for') ??
						reqHeaders.get('x-real-ip'),
					userAgent: reqHeaders.get('user-agent'),
				},
				tx,
			)

			return inserted
		})

		return {
			success: true,
			data: { trackingCode, correlative, responseDeadline },
		}
	} catch {
		return {
			success: false,
			error: 'Ocurrió un error inesperado. Intenta de nuevo.',
		}
	}
}
