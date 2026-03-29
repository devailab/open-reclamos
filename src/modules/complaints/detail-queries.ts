import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	auditLogs,
	complaintAttachments,
	complaintHistory,
	complaintReasons,
	complaints,
	stores,
	users,
} from '@/database/schema'

export interface ComplaintDetail {
	id: string
	correlative: string
	trackingCode: string
	organizationId: string
	storeId: string
	storeName: string
	// estado
	status: string
	type: string
	// consumidor
	firstName: string
	lastName: string
	personType: string
	legalName: string | null
	documentType: string
	documentNumber: string
	isMinor: boolean
	guardianFirstName: string | null
	guardianLastName: string | null
	guardianDocumentType: string | null
	guardianDocumentNumber: string | null
	email: string
	dialCode: string | null
	phone: string | null
	address: string | null
	// detalle del reclamo
	itemType: string | null
	itemDescription: string | null
	amount: string | null
	currency: string | null
	hasProofOfPayment: boolean | null
	proofOfPaymentType: string | null
	proofOfPaymentNumber: string | null
	incidentDate: Date | null
	description: string | null
	request: string | null
	reasonLabel: string | null
	// borrador de respuesta
	draftResponse: string | null
	// respuesta oficial
	officialResponse: string | null
	respondedAt: Date | null
	respondedByName: string | null
	// plazos
	responseDeadline: Date | null
	responseDeadlineDays: number | null
	// fechas
	createdAt: Date
	updatedAt: Date | null
}

export async function getComplaintDetailById(
	id: string,
	organizationId: string,
): Promise<ComplaintDetail | null> {
	const [row] = await db
		.select({
			id: complaints.id,
			correlative: complaints.correlative,
			trackingCode: complaints.trackingCode,
			organizationId: complaints.organizationId,
			storeId: complaints.storeId,
			storeName: stores.name,
			status: complaints.status,
			type: complaints.type,
			firstName: complaints.firstName,
			lastName: complaints.lastName,
			personType: complaints.personType,
			legalName: complaints.legalName,
			documentType: complaints.documentType,
			documentNumber: complaints.documentNumber,
			isMinor: complaints.isMinor,
			guardianFirstName: complaints.guardianFirstName,
			guardianLastName: complaints.guardianLastName,
			guardianDocumentType: complaints.guardianDocumentType,
			guardianDocumentNumber: complaints.guardianDocumentNumber,
			email: complaints.email,
			dialCode: complaints.dialCode,
			phone: complaints.phone,
			address: complaints.address,
			itemType: complaints.itemType,
			itemDescription: complaints.itemDescription,
			amount: complaints.amount,
			currency: complaints.currency,
			hasProofOfPayment: complaints.hasProofOfPayment,
			proofOfPaymentType: complaints.proofOfPaymentType,
			proofOfPaymentNumber: complaints.proofOfPaymentNumber,
			incidentDate: complaints.incidentDate,
			description: complaints.description,
			request: complaints.request,
			reasonLabel: complaintReasons.reason,
			draftResponse: complaints.draftResponse,
			officialResponse: complaints.officialResponse,
			respondedAt: complaints.respondedAt,
			respondedByName: users.name,
			responseDeadline: complaints.responseDeadline,
			responseDeadlineDays: complaints.responseDeadlineDays,
			createdAt: complaints.createdAt,
			updatedAt: complaints.updatedAt,
		})
		.from(complaints)
		.innerJoin(stores, eq(complaints.storeId, stores.id))
		.leftJoin(
			complaintReasons,
			eq(complaints.reasonId, complaintReasons.id),
		)
		.leftJoin(users, eq(complaints.respondedBy, users.id))
		.where(
			and(
				eq(complaints.id, id),
				eq(complaints.organizationId, organizationId),
			),
		)
		.limit(1)

	return row ?? null
}

export interface ComplaintAttachment {
	id: string
	storageKey: string
	fileName: string
	contentType: string | null
}

export async function getAttachmentByStorageKey(
	storageKey: string,
	organizationId: string,
): Promise<{ id: string } | null> {
	const [attachment] = await db
		.select({ id: complaintAttachments.id })
		.from(complaintAttachments)
		.innerJoin(
			complaints,
			eq(complaintAttachments.complaintId, complaints.id),
		)
		.where(
			and(
				eq(complaintAttachments.storageKey, storageKey),
				eq(complaints.organizationId, organizationId),
			),
		)
		.limit(1)
	return attachment ?? null
}

export async function getComplaintAttachments(
	complaintId: string,
): Promise<ComplaintAttachment[]> {
	return db
		.select({
			id: complaintAttachments.id,
			storageKey: complaintAttachments.storageKey,
			fileName: complaintAttachments.fileName,
			contentType: complaintAttachments.contentType,
		})
		.from(complaintAttachments)
		.where(eq(complaintAttachments.complaintId, complaintId))
}

export interface ComplaintAuditEntry {
	id: string
	action: string
	userId: string | null
	userName: string | null
	oldData: unknown
	newData: unknown
	createdAt: Date
}

export async function getComplaintAuditHistory(
	complaintId: string,
	organizationId: string,
): Promise<ComplaintAuditEntry[]> {
	return db
		.select({
			id: auditLogs.id,
			action: auditLogs.action,
			userId: auditLogs.userId,
			userName: users.name,
			oldData: auditLogs.oldData,
			newData: auditLogs.newData,
			createdAt: auditLogs.createdAt,
		})
		.from(auditLogs)
		.leftJoin(users, eq(auditLogs.userId, users.id))
		.where(
			and(
				eq(auditLogs.entityId, complaintId),
				eq(auditLogs.entityType, 'complaint'),
				eq(auditLogs.organizationId, organizationId),
			),
		)
		.orderBy(desc(auditLogs.createdAt))
		.limit(50)
}

export interface ComplaintHistoryEntry {
	id: string
	eventType: string
	fromStatus: string | null
	toStatus: string | null
	publicNote: string | null
	internalNote: string | null
	performedByName: string | null
	performedByRole: string
	createdAt: Date
}

export async function getComplaintHistory(
	complaintId: string,
	organizationId: string,
): Promise<ComplaintHistoryEntry[]> {
	return db
		.select({
			id: complaintHistory.id,
			eventType: complaintHistory.eventType,
			fromStatus: complaintHistory.fromStatus,
			toStatus: complaintHistory.toStatus,
			publicNote: complaintHistory.publicNote,
			internalNote: complaintHistory.internalNote,
			performedByName: users.name,
			performedByRole: complaintHistory.performedByRole,
			createdAt: complaintHistory.createdAt,
		})
		.from(complaintHistory)
		.innerJoin(complaints, eq(complaintHistory.complaintId, complaints.id))
		.leftJoin(users, eq(complaintHistory.performedBy, users.id))
		.where(
			and(
				eq(complaintHistory.complaintId, complaintId),
				eq(complaints.organizationId, organizationId),
			),
		)
		.orderBy(asc(complaintHistory.createdAt))
}
