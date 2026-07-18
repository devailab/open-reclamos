import { relations } from 'drizzle-orm'
import {
	boolean,
	index,
	pgSchema,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

export const authSchema = pgSchema('auth')

export const users = authSchema.table('users', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	setupStatus: text('setup_status').notNull().default('complete'),
	isSuperAdmin: boolean('is_super_admin').notNull().default(false),
	pendingOrganizationId: uuid('pending_organization_id'),
	// Solo se almacena el hash SHA-256 de la API key; el valor completo se muestra una única vez
	apiKeyHash: text('api_key_hash').unique(),
	apiKeyCreatedAt: timestamp('api_key_created_at', {
		withTimezone: true,
		mode: 'date',
	}),
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

export const sessions = authSchema.table(
	'sessions',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
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

export const accounts = authSchema.table(
	'accounts',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
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

export const verifications = authSchema.table(
	'verifications',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
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
