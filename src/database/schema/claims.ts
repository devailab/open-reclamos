import { relations } from 'drizzle-orm'
import {
	boolean,
	index,
	integer,
	numeric,
	pgSchema,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { ubigeos } from './core'
import { organizations, stores } from './org'

export const claimsSchema = pgSchema('claims')

export const complaintReasons = claimsSchema.table('complaint_reasons', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	organizationId: uuid('organization_id').references(() => organizations.id, {
		onDelete: 'cascade',
	}),
	parentId: uuid('parent_id'),
	reason: text('reason').notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
	deletedBy: uuid('deleted_by').references(() => users.id, {
		onDelete: 'set null',
	}),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
	createdBy: uuid('created_by')
		.notNull()
		.references(() => users.id, { onDelete: 'set null' }),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
	updatedBy: uuid('updated_by').references(() => users.id, {
		onDelete: 'set null',
	}),
})

export const complaintCategories = claimsSchema.table(
	'complaint_categories',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		}),
		updatedBy: uuid('updated_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [
		index('complaint_categories_organization_id_idx').on(
			table.organizationId,
		),
		uniqueIndex('complaint_categories_organization_id_name_uidx').on(
			table.organizationId,
			table.name,
		),
	],
)

export const complaints = claimsSchema.table(
	'complaints',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		reasonId: uuid('reason_id').references(() => complaintReasons.id, {
			onDelete: 'set null',
		}),
		categoryId: uuid('category_id').references(
			() => complaintCategories.id,
			{
				onDelete: 'set null',
			},
		),
		ubigeoId: uuid('ubigeo_id').references(() => ubigeos.id, {
			onDelete: 'set null',
		}),
		status: text('status').notNull().default('open'),
		priority: text('priority').notNull().default('medium'),
		trackingCode: text('tracking_code').notNull(),
		correlative: text('correlative').notNull(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		documentType: text('document_type').notNull(),
		documentNumber: text('document_number').notNull(),
		personType: text('person_type').notNull().default('natural'),
		legalName: text('legal_name'),
		isMinor: boolean('is_minor').notNull().default(false),
		guardianFirstName: text('guardian_first_name'),
		guardianLastName: text('guardian_last_name'),
		guardianDocumentType: text('guardian_document_type'),
		guardianDocumentNumber: text('guardian_document_number'),
		email: text('email').notNull(),
		dialCode: text('dial_code'),
		phone: text('phone'),
		address: text('address'),
		type: text('type').notNull(),
		itemType: text('item_type'),
		itemDescription: text('item_description'),
		currency: text('currency'),
		amount: numeric('amount', { precision: 10, scale: 2 }),
		hasProofOfPayment: boolean('has_proof_of_payment').default(false),
		proofOfPaymentType: text('proof_of_payment_type'),
		proofOfPaymentNumber: text('proof_of_payment_number'),
		incidentDate: timestamp('incident_date', {
			withTimezone: true,
			mode: 'date',
		}),
		responseDeadlineDays: integer('response_deadline_days').default(15),
		responseDeadline: timestamp('response_deadline', {
			withTimezone: true,
			mode: 'date',
		}),
		description: text('description'),
		request: text('request'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		}),
		updatedBy: uuid('updated_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [
		index('complaints_organization_id_idx').on(table.organizationId),
		index('complaints_store_id_idx').on(table.storeId),
		index('complaints_reason_id_idx').on(table.reasonId),
		index('complaints_category_id_idx').on(table.categoryId),
		index('complaints_status_idx').on(table.status),
		index('complaints_created_at_idx').on(table.createdAt),
		index('complaints_response_deadline_idx').on(table.responseDeadline),
		index('complaints_organization_created_at_idx').on(
			table.organizationId,
			table.createdAt,
		),
		index('complaints_organization_status_created_at_idx').on(
			table.organizationId,
			table.status,
			table.createdAt,
		),
		index('complaints_organization_store_created_at_idx').on(
			table.organizationId,
			table.storeId,
			table.createdAt,
		),
		index('complaints_organization_deadline_idx').on(
			table.organizationId,
			table.responseDeadline,
		),
		uniqueIndex('complaints_store_id_tracking_code_uidx').on(
			table.storeId,
			table.trackingCode,
		),
		uniqueIndex('complaints_store_id_correlative_uidx').on(
			table.storeId,
			table.correlative,
		),
	],
)

export const complaintDetails = claimsSchema.table(
	'complaint_details',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		complaintId: uuid('complaint_id')
			.notNull()
			.unique()
			.references(() => complaints.id, { onDelete: 'cascade' }),
		draftResponse: text('draft_response'),
		draftUpdatedAt: timestamp('draft_updated_at', {
			withTimezone: true,
			mode: 'date',
		}),
		draftSavedBy: uuid('draft_saved_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		officialResponse: text('official_response'),
		respondedAt: timestamp('responded_at', {
			withTimezone: true,
			mode: 'date',
		}),
		respondedBy: uuid('responded_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		aiSummary: text('ai_summary'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index('complaint_details_organization_id_idx').on(table.organizationId),
		index('complaint_details_complaint_id_idx').on(table.complaintId),
		index('complaint_details_organization_complaint_id_idx').on(
			table.organizationId,
			table.complaintId,
		),
		index('complaint_details_responded_by_idx').on(table.respondedBy),
	],
)

export const complaintDeliveries = claimsSchema.table(
	'complaint_deliveries',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		complaintId: uuid('complaint_id')
			.notNull()
			.unique()
			.references(() => complaints.id, { onDelete: 'cascade' }),
		receiptDeliveryStatus: text('receipt_delivery_status'),
		receiptDeliverySentAt: timestamp('receipt_delivery_sent_at', {
			withTimezone: true,
			mode: 'date',
		}),
		receiptDeliveryError: text('receipt_delivery_error'),
		responseDeliveryStatus: text('response_delivery_status'),
		responseDeliverySentAt: timestamp('response_delivery_sent_at', {
			withTimezone: true,
			mode: 'date',
		}),
		responseDeliveryError: text('response_delivery_error'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index('complaint_deliveries_organization_id_idx').on(
			table.organizationId,
		),
		index('complaint_deliveries_complaint_id_idx').on(table.complaintId),
		index('complaint_deliveries_organization_complaint_id_idx').on(
			table.organizationId,
			table.complaintId,
		),
		index('complaint_deliveries_receipt_status_idx').on(
			table.receiptDeliveryStatus,
		),
		index('complaint_deliveries_response_status_idx').on(
			table.responseDeliveryStatus,
		),
	],
)

export const complaintAttachments = claimsSchema.table(
	'complaint_attachments',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		complaintId: uuid('complaint_id').notNull(),
		storageKey: text('storage_key').notNull(),
		fileName: text('file_name').notNull(),
		contentType: text('content_type'),
		description: text('description'),
	},
)

export const complaintHistory = claimsSchema.table(
	'complaint_history',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		complaintId: uuid('complaint_id')
			.notNull()
			.references(() => complaints.id, { onDelete: 'cascade' }),
		eventType: text('event_type').notNull(),
		fromStatus: text('from_status'),
		toStatus: text('to_status'),
		publicNote: text('public_note'),
		internalNote: text('internal_note'),
		performedBy: uuid('performed_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		performedByRole: text('performed_by_role').notNull().default('system'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index('complaint_history_complaint_id_idx').on(table.complaintId),
		index('complaint_history_created_at_idx').on(table.createdAt),
		index('complaint_history_complaint_id_created_at_idx').on(
			table.complaintId,
			table.createdAt,
		),
	],
)

export const complaintHistoryRelations = relations(
	complaintHistory,
	({ one }) => ({
		complaint: one(complaints, {
			fields: [complaintHistory.complaintId],
			references: [complaints.id],
		}),
		performer: one(users, {
			fields: [complaintHistory.performedBy],
			references: [users.id],
		}),
	}),
)
