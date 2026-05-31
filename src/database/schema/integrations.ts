import {
	index,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { organizations } from './org'

export const integrationsSchema = pgSchema('integrations')

export const webhookEndpoints = integrationsSchema.table(
	'webhook_endpoints',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		targetUrl: text('target_url').notNull(),
		events: jsonb('events').notNull().$type<string[]>().default([]),
		status: text('status').notNull().default('active'),
		secretEncrypted: text('secret_encrypted'),
		customHeaders: jsonb('custom_headers'),
		timeoutMs: integer('timeout_ms').notNull().default(15000),
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
		index('webhook_endpoints_organization_id_idx').on(table.organizationId),
		index('webhook_endpoints_status_idx').on(table.status),
		uniqueIndex('webhook_endpoints_org_slug_uidx').on(
			table.organizationId,
			table.slug,
		),
	],
)

export const webhookDeliveries = integrationsSchema.table(
	'webhook_deliveries',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		endpointId: uuid('endpoint_id').references(() => webhookEndpoints.id, {
			onDelete: 'set null',
		}),
		eventKey: text('event_key').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: uuid('entity_id'),
		status: text('status').notNull().default('pending'),
		attemptCount: integer('attempt_count').notNull().default(0),
		requestBody: jsonb('request_body'),
		responseStatus: integer('response_status'),
		responseBody: text('response_body'),
		errorMessage: text('error_message'),
		nextAttemptAt: timestamp('next_attempt_at', {
			withTimezone: true,
			mode: 'date',
		}),
		sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'date',
		}),
	},
	(table) => [
		index('webhook_deliveries_organization_id_created_at_idx').on(
			table.organizationId,
			table.createdAt,
		),
		index('webhook_deliveries_endpoint_id_idx').on(table.endpointId),
		index('webhook_deliveries_status_created_at_idx').on(
			table.status,
			table.createdAt,
		),
		index('webhook_deliveries_event_key_idx').on(table.eventKey),
	],
)
