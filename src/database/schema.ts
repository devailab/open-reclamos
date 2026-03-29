import { relations } from 'drizzle-orm'
import {
	boolean,
	foreignKey,
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
	ubigeoReniec: text('ubigeo_reniec').unique(),
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

export const permissions = pgTable(
	'permissions',
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
		key: text('key').notNull().unique(),
		slug: text('slug').notNull(),
		module: text('module').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		isSystem: boolean('is_system').notNull().default(false),
		deletedAt: timestamp('deleted_at', {
			withTimezone: true,
			mode: 'date',
		}),
		deletedBy: uuid('deleted_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
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
		index('permissions_organization_id_idx').on(table.organizationId),
		index('permissions_module_idx').on(table.module),
		index('permissions_slug_idx').on(table.slug),
	],
)

export const roles = pgTable(
	'roles',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, {
				onDelete: 'cascade',
			}),
		key: text('key').notNull(),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		isSystem: boolean('is_system').notNull().default(false),
		deletedAt: timestamp('deleted_at', {
			withTimezone: true,
			mode: 'date',
		}),
		deletedBy: uuid('deleted_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
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
		index('roles_organization_id_idx').on(table.organizationId),
		index('roles_slug_idx').on(table.slug),
		uniqueIndex('roles_organization_id_key_uidx').on(
			table.organizationId,
			table.key,
		),
		uniqueIndex('roles_organization_id_slug_uidx').on(
			table.organizationId,
			table.slug,
		),
	],
)

export const rolePermissions = pgTable(
	'role_permissions',
	{
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [
		primaryKey({ columns: [table.roleId, table.permissionId] }),
		index('role_permissions_permission_id_idx').on(table.permissionId),
	],
)

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
		role: text('role').notNull().default('operator'),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'restrict' }),
		storeAccessMode: text('store_access_mode').notNull().default('all'),
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
	(table) => [
		primaryKey({ columns: [table.userId, table.organizationId] }),
		index('organization_members_role_id_idx').on(table.roleId),
	],
)

export const organizationMemberPermissions = pgTable(
	'organization_member_permissions',
	{
		userId: uuid('user_id').notNull(),
		organizationId: uuid('organization_id').notNull(),
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [
		primaryKey({
			columns: [table.userId, table.organizationId, table.permissionId],
		}),
		foreignKey({
			name: 'organization_member_permissions_member_fk',
			columns: [table.userId, table.organizationId],
			foreignColumns: [
				organizationMembers.userId,
				organizationMembers.organizationId,
			],
		}).onDelete('cascade'),
		index('organization_member_permissions_permission_id_idx').on(
			table.permissionId,
		),
	],
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
	formEnabled: boolean('form_enabled').notNull().default(true),
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

export const organizationMemberStores = pgTable(
	'organization_member_stores',
	{
		userId: uuid('user_id').notNull(),
		organizationId: uuid('organization_id').notNull(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [
		primaryKey({
			columns: [table.userId, table.organizationId, table.storeId],
		}),
		foreignKey({
			name: 'organization_member_stores_member_fk',
			columns: [table.userId, table.organizationId],
			foreignColumns: [
				organizationMembers.userId,
				organizationMembers.organizationId,
			],
		}).onDelete('cascade'),
		index('organization_member_stores_store_id_idx').on(table.storeId),
	],
)

export const organizationInvitations = pgTable(
	'organization_invitations',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'restrict' }),
		email: text('email').notNull(),
		tokenHash: text('token_hash').notNull().unique(),
		storeAccessMode: text('store_access_mode').notNull().default('all'),
		expiresAt: timestamp('expires_at', {
			withTimezone: true,
			mode: 'date',
		}).notNull(),
		acceptedAt: timestamp('accepted_at', {
			withTimezone: true,
			mode: 'date',
		}),
		revokedAt: timestamp('revoked_at', {
			withTimezone: true,
			mode: 'date',
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'date',
		})
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'set null' }),
		acceptedBy: uuid('accepted_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		revokedBy: uuid('revoked_by').references(() => users.id, {
			onDelete: 'set null',
		}),
	},
	(table) => [
		index('organization_invitations_organization_id_idx').on(
			table.organizationId,
		),
		index('organization_invitations_email_idx').on(table.email),
		index('organization_invitations_role_id_idx').on(table.roleId),
	],
)

export const organizationInvitationStores = pgTable(
	'organization_invitation_stores',
	{
		invitationId: uuid('invitation_id')
			.notNull()
			.references(() => organizationInvitations.id, {
				onDelete: 'cascade',
			}),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.invitationId, table.storeId] }),
		index('organization_invitation_stores_store_id_idx').on(table.storeId),
	],
)

export const organizationSettings = pgTable('organization_settings', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	organizationId: uuid('organization_id')
		.notNull()
		.unique()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	responseDeadlineDays: integer('response_deadline_days')
		.notNull()
		.default(15),
	formEnabled: boolean('form_enabled').notNull().default(true),
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

export const organizationSettingsRelations = relations(
	organizationSettings,
	({ one }) => ({
		organization: one(organizations, {
			fields: [organizationSettings.organizationId],
			references: [organizations.id],
		}),
	}),
)

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

export const storeCorrelatives = pgTable('store_correlatives', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	storeId: uuid('store_id')
		.notNull()
		.unique()
		.references(() => stores.id, { onDelete: 'cascade' }),
	currentValue: integer('current_value').notNull().default(0),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
})

export const complaintHistory = pgTable(
	'complaint_history',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		complaintId: uuid('complaint_id')
			.notNull()
			.references(() => complaints.id, { onDelete: 'cascade' }),
		// tipo de evento: complaint_created | status_changed | response_added | note_added
		eventType: text('event_type').notNull(),
		// estado anterior (solo en status_changed)
		fromStatus: text('from_status'),
		// estado nuevo
		toStatus: text('to_status'),
		// mensaje visible al consumidor en el seguimiento público
		publicNote: text('public_note'),
		// nota interna solo visible para operadores/admin
		internalNote: text('internal_note'),
		// null = sistema o consumidor; uuid = operador/admin
		performedBy: uuid('performed_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		// 'system' | 'consumer' | 'operator'
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
