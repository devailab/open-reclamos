import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	or,
	sql,
} from 'drizzle-orm'
import { db } from '@/database/database'
import { webhookDeliveries, webhookEndpoints } from '@/database/schema'
import type { WebhookEventKey } from '@/lib/webhook-events'
import type { DeliveriesTableFilters, WebhooksTableFilters } from './validation'

export interface WebhookEndpointRow {
	id: string
	name: string
	slug: string
	targetUrl: string
	events: WebhookEventKey[]
	status: string
	deletedAt: Date | null
	createdAt: Date
	updatedAt: Date | null
}

export interface WebhookDeliveryRow {
	id: string
	endpointId: string | null
	endpointName: string | null
	eventKey: string
	entityType: string
	entityId: string | null
	status: string
	attemptCount: number
	responseStatus: number | null
	errorMessage: string | null
	sentAt: Date | null
	createdAt: Date
}

export async function getWebhooksTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: {
	organizationId: string
	page: number
	pageSize: number
	filters: WebhooksTableFilters
}): Promise<{ rows: WebhookEndpointRow[]; totalItems: number }> {
	const conditions = [eq(webhookEndpoints.organizationId, organizationId)]

	if (filters.name.trim()) {
		conditions.push(
			ilike(webhookEndpoints.name, `%${filters.name.trim()}%`),
		)
	}

	if (filters.status === 'active') {
		conditions.push(isNull(webhookEndpoints.deletedAt))
	} else if (filters.status === 'inactive') {
		conditions.push(isNotNull(webhookEndpoints.deletedAt))
	}

	const where = and(...conditions)
	const offset = (page - 1) * pageSize

	const [rows, [{ total }]] = await Promise.all([
		db
			.select({
				id: webhookEndpoints.id,
				name: webhookEndpoints.name,
				slug: webhookEndpoints.slug,
				targetUrl: webhookEndpoints.targetUrl,
				events: webhookEndpoints.events,
				status: webhookEndpoints.status,
				deletedAt: webhookEndpoints.deletedAt,
				createdAt: webhookEndpoints.createdAt,
				updatedAt: webhookEndpoints.updatedAt,
			})
			.from(webhookEndpoints)
			.where(where)
			.orderBy(desc(webhookEndpoints.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ total: count() }).from(webhookEndpoints).where(where),
	])

	return {
		rows: rows.map((r) => ({
			...r,
			events: (r.events ?? []) as WebhookEventKey[],
		})),
		totalItems: Number(total),
	}
}

export async function getWebhookByIdForOrganization(
	id: string,
	organizationId: string,
) {
	const [row] = await db
		.select()
		.from(webhookEndpoints)
		.where(
			and(
				eq(webhookEndpoints.id, id),
				eq(webhookEndpoints.organizationId, organizationId),
			),
		)
		.limit(1)

	return row ?? null
}

export async function getActiveWebhooksByEventForOrganization(
	organizationId: string,
	eventKey: WebhookEventKey,
) {
	// Filtra endpoints activos que tengan el evento en su jsonb array
	return db
		.select({
			id: webhookEndpoints.id,
			targetUrl: webhookEndpoints.targetUrl,
			secretEncrypted: webhookEndpoints.secretEncrypted,
			timeoutMs: webhookEndpoints.timeoutMs,
		})
		.from(webhookEndpoints)
		.where(
			and(
				eq(webhookEndpoints.organizationId, organizationId),
				isNull(webhookEndpoints.deletedAt),
				eq(webhookEndpoints.status, 'active'),
				sql`${webhookEndpoints.events} @> ${JSON.stringify([eventKey])}::jsonb`,
			),
		)
}

export async function checkWebhookSlugExists(
	slug: string,
	organizationId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: webhookEndpoints.id })
		.from(webhookEndpoints)
		.where(
			and(
				eq(webhookEndpoints.slug, slug),
				eq(webhookEndpoints.organizationId, organizationId),
			),
		)
		.limit(1)

	return Boolean(row)
}

export async function getDeliveriesTableForOrganization({
	organizationId,
	page,
	pageSize,
	filters,
}: {
	organizationId: string
	page: number
	pageSize: number
	filters: DeliveriesTableFilters
}): Promise<{ rows: WebhookDeliveryRow[]; totalItems: number }> {
	const conditions = [eq(webhookDeliveries.organizationId, organizationId)]

	if (filters.endpointId && filters.endpointId !== 'all') {
		conditions.push(eq(webhookDeliveries.endpointId, filters.endpointId))
	}

	if (filters.status && filters.status !== 'all') {
		conditions.push(eq(webhookDeliveries.status, filters.status))
	}

	const where = and(...conditions)
	const offset = (page - 1) * pageSize

	const [rows, [{ total }]] = await Promise.all([
		db
			.select({
				id: webhookDeliveries.id,
				endpointId: webhookDeliveries.endpointId,
				endpointName: webhookEndpoints.name,
				eventKey: webhookDeliveries.eventKey,
				entityType: webhookDeliveries.entityType,
				entityId: webhookDeliveries.entityId,
				status: webhookDeliveries.status,
				attemptCount: webhookDeliveries.attemptCount,
				responseStatus: webhookDeliveries.responseStatus,
				errorMessage: webhookDeliveries.errorMessage,
				sentAt: webhookDeliveries.sentAt,
				createdAt: webhookDeliveries.createdAt,
			})
			.from(webhookDeliveries)
			.leftJoin(
				webhookEndpoints,
				eq(webhookDeliveries.endpointId, webhookEndpoints.id),
			)
			.where(where)
			.orderBy(desc(webhookDeliveries.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ total: count() }).from(webhookDeliveries).where(where),
	])

	return {
		rows: rows.map((r) => ({
			...r,
			endpointId: r.endpointId ?? null,
			entityId: r.entityId ?? null,
		})),
		totalItems: Number(total),
	}
}

export async function getEndpointSelectOptions(organizationId: string) {
	return db
		.select({ id: webhookEndpoints.id, name: webhookEndpoints.name })
		.from(webhookEndpoints)
		.where(
			and(
				eq(webhookEndpoints.organizationId, organizationId),
				or(
					isNull(webhookEndpoints.deletedAt),
					isNotNull(webhookEndpoints.deletedAt),
				),
			),
		)
		.orderBy(webhookEndpoints.name)
}
