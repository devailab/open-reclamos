export interface ComplaintCategorySummary {
	id: string
	name: string
	description: string | null
}

export interface ComplaintDetail {
	id: string
	correlative: string
	trackingCode: string
	organizationId: string
	storeId: string
	reasonId: string | null
	categoryId: string | null
	ubigeoId: string | null
	storeName: string
	// estado
	status: string
	type: string
	priority: string
	// consumidor
	firstName: string
	lastName: string
	personType: string
	legalName: string | null
	legalTaxId: string | null
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
	category: ComplaintCategorySummary | null
	// respuesta oficial
	officialResponse: string | null
	respondedAt: Date | null
	respondedByName: string | null
	receiptDeliveryStatus: string | null
	receiptDeliverySentAt: Date | null
	receiptDeliveryError: string | null
	responseDeliveryStatus: string | null
	responseDeliverySentAt: Date | null
	responseDeliveryError: string | null
	// plazos
	responseDeadline: Date | null
	responseDeadlineDays: number | null
	// fechas
	createdAt: Date
	updatedAt: Date | null
}

export interface ComplaintAttachment {
	id: string
	storageKey: string
	fileName: string
	contentType: string | null
}

export interface ComplaintAuditEntry {
	id: string
	action: string
	userId: string | null
	userName: string | null
	oldData: unknown
	newData: unknown
	description: string | null
	createdAt: Date
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

export interface ComplaintTableRow {
	id: string
	correlative: string
	type: string
	firstName: string
	lastName: string
	storeId: string
	storeName: string
	storeColor: string
	status: string
	priority: string
	category: ComplaintCategorySummary | null
	responseDeadline: Date | null
	responseDeadlineDays: number | null
	hasResponse: boolean
	createdAt: Date
}

export interface StoreOption {
	id: string
	name: string
	color: string
}

export interface ComplaintsDashboardKpis {
	total: number
	open: number
	inReview: number
	resolved: number
	overdue: number
}

export interface FeaturedComplaint {
	id: string
	correlative: string
	type: string
	firstName: string
	lastName: string
	storeName: string
	storeColor: string
	status: string
	priority: string
	category: ComplaintCategorySummary | null
	responseDeadline: Date | null
	responseDeadlineDays: number | null
	createdAt: Date
}

export interface PublicHistoryEntry {
	eventType: string
	toStatus: string | null
	publicNote: string | null
	performedByRole: string
	createdAt: Date
}

export type ComplaintCategoryRow = ComplaintCategorySummary
