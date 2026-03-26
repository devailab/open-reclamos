import { relations } from 'drizzle-orm'
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

export const ubigeos = pgTable('ubigeos', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	ubigeo: text('ubigeo').notNull().unique(),
	department: text('department').notNull(),
	province: text('province').notNull(),
	district: text('district').notNull(),
	name: text('name').notNull(),
})

export const countries = pgTable('countries', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text('name').notNull(),
	iso2: text('iso2').notNull().unique(),
	iso3: text('iso3').notNull().unique(),
	phoneCode: text('phone_code').notNull(),
	continent: text('continent').notNull(),
})

export const users = pgTable('users', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	// estado del onboarding: 'organization' | 'store' | 'complete'
	// default 'complete' para que usuarios existentes no sean redirigidos
	setupStatus: text('setup_status').notNull().default('complete'),
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'date',
	})
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'date',
	})
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
})

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		expiresAt: timestamp('expires_at', {
			withTimezone: true,
			mode: 'date',
		}).notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		})
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
	},
	(table) => [index('sessions_userId_idx').on(table.userId)],
)

export const accounts = pgTable(
	'accounts',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', {
			withTimezone: true,
			mode: 'date',
		}),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
			withTimezone: true,
			mode: 'date',
		}),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		})
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index('accounts_userId_idx').on(table.userId)],
)

export const verifications = pgTable(
	'verifications',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', {
			withTimezone: true,
			mode: 'date',
		}).notNull(),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export const userRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
}))

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}))

export const accountRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}))

// empresas
export const organizations = pgTable('organizations', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	ubigeoId: uuid('ubigeo_id')
		.notNull()
		.references(() => ubigeos.id, { onDelete: 'set null' }),
	slug: text('slug').notNull().unique(),
	// nombre comercial
	name: text('name').notNull(),
	// razón social
	legalName: text('legal_name').notNull(),
	// ruc
	taxId: text('tax_id').notNull().unique(),
	// tipo de direccion como calle, avenida, etc
	addressType: text('address_type').notNull(),
	address: text('address').notNull(),
	// codigo de marcacion telefonica del pais
	phoneCode: text('phone_code'),
	phone: text('phone'),
	website: text('website'),
	primaryColor: text('primary_color'),
	logoKey: text('logo_key'),
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

// tabla intermedia para multi-tenant (muchos a muchos)
export const organizationMembers = pgTable(
	'organization_members',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		// rol del usuario en esta empresa específica
		role: text('role').notNull().default('operator'), // 'admin' | 'operator' | 'viewer'
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'set null' }),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		}),
		updatedBy: uuid('updated_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [primaryKey({ columns: [table.userId, table.organizationId] })],
)

// tiendas
export const stores = pgTable('stores', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	organizationId: uuid('organization_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	// nullable para tiendas virtuales
	ubigeoId: uuid('ubigeo_id').references(() => ubigeos.id, {
		onDelete: 'set null',
	}),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	// tipo que puede ser virtual o fisica
	type: text('type').notNull(), // 'physical' | 'virtual'
	// nullable para tiendas virtuales
	addressType: text('address_type'),
	address: text('address'),
	// url de la tienda (virtual)
	url: text('url'),
	// soft delete en store
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

export const complaintReasons = pgTable('complaint_reasons', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
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

export const complaints = pgTable(
	'complaints',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		// multi-tenant directo para facilitar reportes
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		reasonId: uuid('reason_id').references(() => complaintReasons.id, {
			onDelete: 'set null',
		}),
		ubigeoId: uuid('ubigeo_id').references(() => ubigeos.id, {
			onDelete: 'set null',
		}),
		// estado de la queja como abierta, en proceso, cerrada, etc
		status: text('status').notNull().default('open'),
		trackingCode: text('tracking_code').notNull(),
		correlative: text('correlative').notNull(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		documentType: text('document_type').notNull(),
		documentNumber: text('document_number').notNull(),
		// tipo de persona: 'natural' | 'juridical'
		personType: text('person_type').notNull().default('natural'),
		// rason social para en caso sea persona juridica
		legalName: text('legal_name'),
		// es menor de edad?
		isMinor: boolean('is_minor').notNull().default(false),
		// datos opcionales del padre o tutor: nombres, apellidos, tipo de documento, numero de documento
		guardianFirstName: text('guardian_first_name'),
		guardianLastName: text('guardian_last_name'),
		guardianDocumentType: text('guardian_document_type'),
		guardianDocumentNumber: text('guardian_document_number'),
		email: text('email').notNull(),
		dialCode: text('dial_code'),
		phone: text('phone'),
		address: text('address'),
		// tipo: reclamo o queja
		type: text('type').notNull(), // 'complaint' | 'claim'
		// tipo de bien contratado: producto o servicio
		itemType: text('item_type'), // 'product' | 'service'
		itemDescription: text('item_description'),
		// tipo de moneda
		currency: text('currency'),
		// monto economico reclamado
		amount: numeric('amount', {
			precision: 10,
			scale: 2,
		}),
		// tengo comprobante de pago?
		hasProofOfPayment: boolean('has_proof_of_payment').default(false),
		// tipo de comprobante de pago: factura, boleta, etc
		proofOfPaymentType: text('proof_of_payment_type'),
		// numero de comprobante de pago
		proofOfPaymentNumber: text('proof_of_payment_number'),
		// fecha del incidente
		incidentDate: timestamp('incident_date', {
			withTimezone: true,
			mode: 'date',
		}),
		// plazo maximo de respuesta en dias
		responseDeadlineDays: integer('response_deadline_days').default(15),
		// fecha de limite de respuesta preguardado
		responseDeadline: timestamp('response_deadline', {
			withTimezone: true,
			mode: 'date',
		}),
		// descripcion del reclamo o queja
		description: text('description'),
		// pedido realizado al proveedor o empresa
		request: text('request'),
		// respuesta oficial de la empresa al consumidor
		officialResponse: text('official_response'),
		// fecha en que se registró la respuesta oficial
		respondedAt: timestamp('responded_at', {
			withTimezone: true,
			mode: 'date',
		}),
		// usuario que registró la respuesta
		respondedBy: uuid('responded_by').references(() => users.id, {
			onDelete: 'set null',
		}),
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

// archivos adjuntos a las quejas o reclamos
export const complaintAttachments = pgTable('complaint_attachments', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	complaintId: uuid('complaint_id').notNull(),
	storageKey: text('storage_key').notNull(),
	fileName: text('file_name').notNull(),
	contentType: text('content_type'),
	description: text('description'),
})

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		organizationId: uuid('organization_id').references(
			() => organizations.id,
			{
				onDelete: 'cascade',
			},
		),
		userId: uuid('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: uuid('entity_id'),
		oldData: jsonb('old_data'),
		newData: jsonb('new_data'),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index('audit_logs_organization_id_idx').on(table.organizationId),
		index('audit_logs_created_at_idx').on(table.createdAt),
		index('audit_logs_action_idx').on(table.action),
		index('audit_logs_entity_type_idx').on(table.entityType),
		index('audit_logs_entity_id_idx').on(table.entityId),
		index('audit_logs_organization_created_at_idx').on(
			table.organizationId,
			table.createdAt,
		),
	],
)
