import { endOfDay, startOfDay } from 'date-fns'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	complaintDetails,
	complaintReasons,
	complaints,
	organizations,
	stores,
	ubigeos,
} from '@/database/schema'

export interface ExportComplaintRow {
	id: string
	correlative: string
	trackingCode: string
	storeId: string
	storeName: string
	storeSlug: string
	storeType: string
	storeAddressType: string | null
	storeAddress: string | null
	storeUrl: string | null
	status: string
	type: string
	personType: string
	firstName: string
	lastName: string
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
	itemType: string | null
	itemDescription: string | null
	amount: string | null
	currency: string | null
	hasProofOfPayment: boolean | null
	proofOfPaymentType: string | null
	proofOfPaymentNumber: string | null
	incidentDate: Date | null
	reasonId: string | null
	ubigeoId: string | null
	reasonLabel: string | null
	description: string | null
	request: string | null
	responseDeadline: Date | null
	responseDeadlineDays: number | null
	officialResponse: string | null
	respondedAt: Date | null
	createdAt: Date
}

export interface ExportOrganizationInfo {
	id: string
	name: string
	legalName: string
	taxId: string
	addressType: string
	address: string
	locationLabel: string | null
	phoneCode: string | null
	phone: string | null
	website: string | null
	primaryColor: string | null
}

interface GetComplaintsForExportParams {
	organizationId: string
	storeId: string
	startDate: Date
	endDate: Date
	allowedStoreIds?: string[]
}

export async function getComplaintsForExport({
	organizationId,
	storeId,
	startDate,
	endDate,
	allowedStoreIds,
}: GetComplaintsForExportParams): Promise<ExportComplaintRow[]> {
	if (allowedStoreIds !== undefined && !allowedStoreIds.includes(storeId)) {
		return []
	}

	return db
		.select({
			id: complaints.id,
			correlative: complaints.correlative,
			trackingCode: complaints.trackingCode,
			storeId: complaints.storeId,
			storeName: stores.name,
			storeSlug: stores.slug,
			storeType: stores.type,
			storeAddressType: stores.addressType,
			storeAddress: stores.address,
			storeUrl: stores.url,
			status: complaints.status,
			type: complaints.type,
			personType: complaints.personType,
			firstName: complaints.firstName,
			lastName: complaints.lastName,
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
			reasonId: complaints.reasonId,
			ubigeoId: complaints.ubigeoId,
			reasonLabel: complaintReasons.reason,
			description: complaints.description,
			request: complaints.request,
			responseDeadline: complaints.responseDeadline,
			responseDeadlineDays: complaints.responseDeadlineDays,
			officialResponse: complaintDetails.officialResponse,
			respondedAt: complaintDetails.respondedAt,
			createdAt: complaints.createdAt,
		})
		.from(complaints)
		.innerJoin(stores, eq(complaints.storeId, stores.id))
		.leftJoin(
			complaintDetails,
			eq(complaintDetails.complaintId, complaints.id),
		)
		.leftJoin(
			complaintReasons,
			eq(complaintReasons.id, complaints.reasonId),
		)
		.where(
			and(
				eq(complaints.organizationId, organizationId),
				eq(complaints.storeId, storeId),
				gte(complaints.createdAt, startOfDay(startDate)),
				lte(complaints.createdAt, endOfDay(endDate)),
			),
		)
		.orderBy(asc(complaints.createdAt))
}

export async function getOrganizationForExport(
	organizationId: string,
): Promise<ExportOrganizationInfo | null> {
	const [row] = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			legalName: organizations.legalName,
			taxId: organizations.taxId,
			addressType: organizations.addressType,
			address: organizations.address,
			phoneCode: organizations.phoneCode,
			phone: organizations.phone,
			website: organizations.website,
			primaryColor: organizations.primaryColor,
			district: ubigeos.district,
			province: ubigeos.province,
			department: ubigeos.department,
		})
		.from(organizations)
		.leftJoin(ubigeos, eq(organizations.ubigeoId, ubigeos.id))
		.where(eq(organizations.id, organizationId))
		.limit(1)

	if (!row) return null

	const locationParts = [row.district, row.province, row.department].filter(
		Boolean,
	)

	return {
		id: row.id,
		name: row.name,
		legalName: row.legalName,
		taxId: row.taxId,
		addressType: row.addressType,
		address: row.address,
		locationLabel:
			locationParts.length > 0 ? locationParts.join(', ') : null,
		phoneCode: row.phoneCode,
		phone: row.phone,
		website: row.website,
		primaryColor: row.primaryColor,
	}
}
