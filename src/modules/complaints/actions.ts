'use server'

import { addDays } from 'date-fns'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/database/database'
import {
	complaintAttachments,
	complaintReasons,
	complaints,
	storeCorrelatives,
} from '@/database/schema'
import { isAiClassificationConfigured } from '@/lib/ai'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { moveS3Object } from '@/lib/s3'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { WEBHOOK_EVENT } from '@/lib/webhook-events'
import { getOrganizationComplaintSettingsForOrganization } from '@/modules/settings/queries'
import { dispatchWebhookEvent } from '../webhooks/dispatch'
import { enqueueComplaintAiClassification } from './ai-classification'
import {
	enqueueComplaintReceiptDelivery,
	getComplaintDeliveryFailure,
	setComplaintDeliveryStatus,
} from './delivery'
import { createComplaintHistoryEntry } from './history'
import { generateTrackingCode } from './lib'
import { getStoreForOrganization } from './queries'

const TMP_PREFIX = 'tmp/'
// Formato esperado: tmp/complaints/<storeId>/<filename>
const TMP_KEY_STORE_SEGMENT = 2

async function confirmUploadedFiles(
	files: UploadedFileInput[],
	expectedStoreId: string,
	confirmedFiles: ConfirmedUploadedFile[],
): Promise<ConfirmedUploadedFile[]> {
	for (const file of files) {
		if (!file.key.startsWith(TMP_PREFIX)) {
			throw new Error('Archivo no válido.')
		}

		const segments = file.key.split('/')
		if (segments[TMP_KEY_STORE_SEGMENT] !== expectedStoreId) {
			throw new Error('Archivo no pertenece a la tienda indicada.')
		}

		const permanentKey = file.key.slice(TMP_PREFIX.length)
		await moveS3Object(file.key, permanentKey)

		confirmedFiles.push({
			...file,
			key: permanentKey,
			originalKey: file.key,
		})
	}

	return confirmedFiles
}

async function rollbackConfirmedFiles(
	files: ConfirmedUploadedFile[],
): Promise<void> {
	for (const file of [...files].reverse()) {
		try {
			await moveS3Object(file.key, file.originalKey)
		} catch (error) {
			console.error(
				'[complaints] No se pudo revertir archivo confirmado:',
				error,
			)
		}
	}
}

export interface UploadedFileInput {
	key: string
	fileName: string
	contentType: string
}

interface ConfirmedUploadedFile extends UploadedFileInput {
	originalKey: string
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
	// Bot protection
	turnstileToken: string
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
	// Verificar token de Turnstile
	const reqHeaders = await headers()
	const remoteip =
		reqHeaders.get('x-forwarded-for') ??
		reqHeaders.get('x-real-ip') ??
		undefined
	const isTurnstileValid = await verifyTurnstileToken(
		input.turnstileToken,
		remoteip,
	)
	if (!isTurnstileValid) {
		return {
			success: false,
			error: 'Verificación de seguridad fallida. Recarga la página e intenta nuevamente.',
		}
	}

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

	const organizationSettings =
		await getOrganizationComplaintSettingsForOrganization(
			input.organizationId,
		)

	if (!organizationSettings.formEnabled) {
		return {
			success: false,
			error: 'El formulario de reclamos no está disponible actualmente.',
		}
	}

	// Verificar que la tienda pertenece a la organización indicada
	const store = await getStoreForOrganization(
		input.storeId,
		input.organizationId,
	)
	if (!store) {
		return { success: false, error: 'Datos de tienda inválidos.' }
	}

	// Verificar que el motivo pertenece a la organización y no está eliminado
	if (input.reasonId) {
		const [reason] = await db
			.select({ id: complaintReasons.id })
			.from(complaintReasons)
			.where(
				and(
					eq(complaintReasons.id, input.reasonId),
					eq(complaintReasons.organizationId, input.organizationId),
					isNull(complaintReasons.deletedAt),
				),
			)
			.limit(1)
		if (!reason) {
			return { success: false, error: 'Motivo de reclamo no válido.' }
		}
	}

	const confirmedFiles: ConfirmedUploadedFile[] = []
	let complaintId: string | null = null
	const trackingCode = generateTrackingCode()
	const now = new Date()
	const responseDeadline = addDays(
		now,
		organizationSettings.responseDeadlineDays,
	)
	let correlative!: string

	try {
		await db.transaction(async (tx) => {
			if (input.files.length > 0) {
				await confirmUploadedFiles(
					input.files,
					input.storeId,
					confirmedFiles,
				)
			}

			const [correlativeRow] = await tx
				.insert(storeCorrelatives)
				.values({ storeId: input.storeId, currentValue: 1 })
				.onConflictDoUpdate({
					target: storeCorrelatives.storeId,
					set: {
						currentValue: sql`${storeCorrelatives.currentValue} + 1`,
						updatedAt: now,
					},
				})
				.returning({ currentValue: storeCorrelatives.currentValue })

			if (!correlativeRow) throw new Error('correlative increment failed')

			correlative = String(correlativeRow.currentValue).padStart(4, '0')

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
					responseDeadlineDays:
						organizationSettings.responseDeadlineDays,
					responseDeadline,
					description: input.description ?? null,
					request: input.request ?? null,
				})
				.returning({ id: complaints.id })

			if (!inserted?.id) throw new Error('insert failed')

			if (confirmedFiles.length > 0) {
				await tx.insert(complaintAttachments).values(
					confirmedFiles.map((f) => ({
						complaintId: inserted.id,
						storageKey: f.key,
						fileName: f.fileName,
						contentType: f.contentType,
						description: `Adjunto enviado por el consumidor: ${f.fileName}`,
					})),
				)
			}

			await createAuditLog(
				{
					organizationId: input.organizationId,
					action: AUDIT_LOG.COMPLAINT_SUBMITTED,
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

			await createComplaintHistoryEntry(
				{
					complaintId: inserted.id,
					eventType: 'complaint_created',
					toStatus: 'open',
					publicNote: 'Tu reclamo fue registrado exitosamente.',
					performedByRole: 'consumer',
				},
				tx,
			)
			await setComplaintDeliveryStatus(
				{
					complaintId: inserted.id,
					organizationId: input.organizationId,
					workflow: 'receipt',
					status: 'queued',
				},
				tx,
			)

			complaintId = inserted.id

			return inserted
		})
	} catch (error) {
		console.error('[complaints] Error al registrar reclamo:', error)

		if (!complaintId) {
			await rollbackConfirmedFiles(confirmedFiles)
		}

		return {
			success: false,
			error:
				error instanceof Error &&
				(error.message === 'Archivo no válido.' ||
					error.message ===
						'Archivo no pertenece a la tienda indicada.')
					? error.message
					: 'Ocurrió un error inesperado. Intenta de nuevo.',
		}
	}

	if (complaintId) {
		if (
			organizationSettings.aiClassificationEnabled &&
			isAiClassificationConfigured()
		) {
			try {
				await enqueueComplaintAiClassification({
					complaintId,
					organizationId: input.organizationId,
				})
			} catch (error) {
				console.error(
					'[complaints] No se pudo encolar la clasificación con IA:',
					error,
				)
			}
		}

		try {
			await enqueueComplaintReceiptDelivery({
				complaintId,
				organizationId: input.organizationId,
			})
		} catch (error) {
			console.error(
				'[complaints] No se pudo encolar el envío de constancia:',
				error,
			)

			const failure = getComplaintDeliveryFailure({
				workflow: 'receipt',
				error,
			})

			await setComplaintDeliveryStatus({
				complaintId,
				organizationId: input.organizationId,
				workflow: 'receipt',
				status: 'failed',
				failureMessage: failure.technicalMessage,
			})
		}

		try {
			await dispatchWebhookEvent({
				organizationId: input.organizationId,
				eventKey: WEBHOOK_EVENT.COMPLAINT_SUBMITTED,
				entityType: 'complaint',
				entityId: complaintId,
				payload: {
					trackingCode,
					correlative,
					type: input.type,
					status: 'open',
				},
			})
		} catch (error) {
			console.error(
				'[webhooks] No se pudo disparar complaint.submitted:',
				error,
			)
		}
	}

	return {
		success: true,
		data: { trackingCode, correlative, responseDeadline },
	}
}
