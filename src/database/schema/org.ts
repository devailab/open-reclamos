import { relations } from 'drizzle-orm'
import {
	boolean,
	foreignKey,
	index,
	integer,
	pgSchema,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { ORGANIZATION_STATUS_ACTIVE } from '@/modules/platform/constants'
import { DEFAULT_STORE_COLOR } from '@/modules/stores/constants'
import { users } from './auth'
import { ubigeos } from './core'

export const orgSchema = pgSchema('org')

export const organizations = orgSchema.table('organizations', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	ubigeoId: uuid('ubigeo_id')
		.notNull()
		.references(() => ubigeos.id, { onDelete: 'restrict' }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	legalName: text('legal_name').notNull(),
	taxId: text('tax_id').notNull().unique(),
	addressType: text('address_type').notNull(),
	address: text('address').notNull(),
	phoneCode: text('phone_code'),
	phone: text('phone'),
	website: text('website'),
	primaryColor: text('primary_color'),
	logoKey: text('logo_key'),
	// Estado de la organización a nivel plataforma: 'active' | 'suspended'.
	// Una organización suspendida pierde acceso al dashboard, a la API y a
	// sus formularios públicos. Solo el super admin puede cambiarlo.
	status: text('status').notNull().default(ORGANIZATION_STATUS_ACTIVE),
	suspendedAt: timestamp('suspended_at', {
		withTimezone: true,
		mode: 'date',
	}),
	suspendedBy: uuid('suspended_by').references(() => users.id, {
		onDelete: 'set null',
	}),
	suspensionReason: text('suspension_reason'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
	// Nullable: al eliminar el usuario creador se preserva la organización (ON DELETE SET NULL)
	createdBy: uuid('created_by').references(() => users.id, {
		onDelete: 'set null',
	}),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
	updatedBy: uuid('updated_by').references(() => users.id, {
		onDelete: 'set null',
	}),
})

export const roles = orgSchema.table(
	'roles',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		level: integer('level').notNull(),
		isSystem: boolean('is_system').notNull().default(false),
		deletedAt: timestamp('deleted_at', {
			withTimezone: true,
			mode: 'date',
		}),
		deletedBy: uuid('deleted_by').references(() => users.id, {
			onDelete: 'set null',
		}),
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

export const permissions = orgSchema.table(
	'permissions',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id').references(
			() => organizations.id,
			{ onDelete: 'cascade' },
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
		index('permissions_organization_id_idx').on(table.organizationId),
		index('permissions_module_idx').on(table.module),
		index('permissions_slug_idx').on(table.slug),
	],
)

export const rolePermissions = orgSchema.table(
	'role_permissions',
	{
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
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
		primaryKey({ columns: [table.roleId, table.permissionId] }),
		index('role_permissions_permission_id_idx').on(table.permissionId),
	],
)

export const organizationMembers = orgSchema.table(
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
		primaryKey({ columns: [table.userId, table.organizationId] }),
		index('organization_members_role_id_idx').on(table.roleId),
	],
)

export const organizationMemberPermissions = orgSchema.table(
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

export const stores = orgSchema.table('stores', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	organizationId: uuid('organization_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	ubigeoId: uuid('ubigeo_id').references(() => ubigeos.id, {
		onDelete: 'set null',
	}),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	type: text('type').notNull(),
	color: text('color').notNull().default(DEFAULT_STORE_COLOR),
	addressType: text('address_type'),
	address: text('address'),
	url: text('url'),
	formEnabled: boolean('form_enabled').notNull().default(true),
	deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
	deletedBy: uuid('deleted_by').references(() => users.id, {
		onDelete: 'set null',
	}),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
	createdBy: uuid('created_by').references(() => users.id, {
		onDelete: 'set null',
	}),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
	updatedBy: uuid('updated_by').references(() => users.id, {
		onDelete: 'set null',
	}),
})

export const organizationMemberStores = orgSchema.table(
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

export const organizationInvitations = orgSchema.table(
	'organization_invitations',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
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
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		createdBy: uuid('created_by').references(() => users.id, {
			onDelete: 'set null',
		}),
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

export const organizationInvitationStores = orgSchema.table(
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

export const organizationSettings = orgSchema.table('organization_settings', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	organizationId: uuid('organization_id')
		.notNull()
		.unique()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	responseDeadlineDays: integer('response_deadline_days')
		.notNull()
		.default(15),
	formEnabled: boolean('form_enabled').notNull().default(true),
	mcpEnabledTools: text('mcp_enabled_tools'),
	mcpShowSensitiveData: boolean('mcp_show_sensitive_data')
		.notNull()
		.default(false),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
	createdBy: uuid('created_by').references(() => users.id, {
		onDelete: 'set null',
	}),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
	updatedBy: uuid('updated_by').references(() => users.id, {
		onDelete: 'set null',
	}),
})

export const storeCorrelatives = orgSchema.table('store_correlatives', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	storeId: uuid('store_id')
		.notNull()
		.unique()
		.references(() => stores.id, { onDelete: 'cascade' }),
	currentValue: integer('current_value').notNull().default(0),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
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
