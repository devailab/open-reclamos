'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { webhookEndpoints } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import {
	checkWebhookSlugExists,
	getDeliveriesTableForOrganization,
	getEndpointSelectOptions,
	getWebhookByIdForOrganization,
	getWebhooksTableForOrganization,
	type WebhookDeliveryRow,
	type WebhookEndpointRow,
} from './queries'
import {
	type DeliveriesTableFilters,
	normalizeDeliveriesTableFilters,
	normalizeWebhookMutationInput,
	normalizeWebhooksPagination,
	normalizeWebhooksTableFilters,
	validateWebhookId,
	validateWebhookMutationInput,
	type WebhookMutationInput,
	type WebhooksTableFilters,
} from './validation'

export type WebhookActionResult = { error: string } | { success: true }

export interface GetWebhooksTableActionResult {
	rows: WebhookEndpointRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: WebhooksTableFilters
}

export interface GetDeliveriesTableActionResult {
	rows: WebhookDeliveryRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: DeliveriesTableFilters
	endpointOptions: { id: string; name: string }[]
}

async function requireAccess(permissionKey: string): Promise<
	| { error: string; session?: never; membership?: never }
	| {
			error?: never
			session: NonNullable<Awaited<ReturnType<typeof getSession>>>
			membership: NonNullable<
				Awaited<ReturnType<typeof getMembershipContext>>
			>
	  }
> {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return { error: 'No tienes permisos para realizar esta acción.' }
	}

	return { session, membership }
}

const buildWebhookSlugBase = (name: string): string => {
	const base = name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)

	return base || 'webhook'
}

const getUniqueWebhookSlug = async (
	name: string,
	organizationId: string,
): Promise<string> => {
	const base = buildWebhookSlugBase(name)
	let slug = base
	let counter = 2

	while (await checkWebhookSlugExists(slug, organizationId)) {
		slug = `${base}-${counter}`
		counter++
	}

	return slug
}

export async function $getWebhooksTableAction(input: {
	page: number
	pageSize: number
	filters?: Partial<WebhooksTableFilters>
}): Promise<GetWebhooksTableActionResult> {
	const access = await requireAccess('webhooks.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizeWebhooksTableFilters(),
		}
	}

	const { page, pageSize } = normalizeWebhooksPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeWebhooksTableFilters(input.filters)

	const { rows, totalItems } = await getWebhooksTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $createWebhookAction(
	input: WebhookMutationInput,
): Promise<WebhookActionResult> {
	const access = await requireAccess('webhooks.manage')
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

	const normalized = normalizeWebhookMutationInput(input)
	const validationError = validateWebhookMutationInput(normalized)
	if (validationError) return { error: validationError }

	const slug = await getUniqueWebhookSlug(
		normalized.name,
		access.membership.organizationId,
	)

	try {
		await db.transaction(async (tx) => {
			const [endpoint] = await tx
				.insert(webhookEndpoints)
				.values({
					organizationId: access.membership.organizationId,
					name: normalized.name,
					slug,
					targetUrl: normalized.targetUrl,
					events: normalized.events,
					status: normalized.status,
					createdBy: access.session.user.id,
				})
				.returning({ id: webhookEndpoints.id })

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.WEBHOOK_CREATED,
					entityType: 'webhook',
					entityId: endpoint.id,
					newData: {
						name: normalized.name,
						targetUrl: normalized.targetUrl,
						events: normalized.events,
						status: normalized.status,
					},
				},
				tx,
			)
		})
	} catch {
		return { error: 'No se pudo crear el webhook. Inténtalo nuevamente.' }
	}

	revalidatePath('/dashboard/webhooks')
	return { success: true }
}

export type UpdateWebhookActionInput = WebhookMutationInput & { id: string }

export async function $updateWebhookAction(
	input: UpdateWebhookActionInput,
): Promise<WebhookActionResult> {
	const access = await requireAccess('webhooks.manage')
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

	const idError = validateWebhookId(input.id)
	if (idError) return { error: idError }

	const current = await getWebhookByIdForOrganization(
		input.id,
		access.membership.organizationId,
	)
	if (!current) return { error: 'El webhook no fue encontrado.' }
	if (current.deletedAt)
		return { error: 'El webhook está eliminado y no se puede editar.' }

	const normalized = normalizeWebhookMutationInput(input)
	const validationError = validateWebhookMutationInput(normalized)
	if (validationError) return { error: validationError }

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(webhookEndpoints)
				.set({
					name: normalized.name,
					targetUrl: normalized.targetUrl,
					events: normalized.events,
					status: normalized.status,
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(webhookEndpoints.id, input.id),
						eq(
							webhookEndpoints.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.WEBHOOK_UPDATED,
					entityType: 'webhook',
					entityId: input.id,
					oldData: {
						name: current.name,
						targetUrl: current.targetUrl,
						events: current.events,
						status: current.status,
					},
					newData: {
						name: normalized.name,
						targetUrl: normalized.targetUrl,
						events: normalized.events,
						status: normalized.status,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar el webhook. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/webhooks')
	return { success: true }
}

export async function $deleteWebhookAction(
	id: string,
): Promise<WebhookActionResult> {
	const access = await requireAccess('webhooks.manage')
	if ('error' in access)
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}

	const idError = validateWebhookId(id)
	if (idError) return { error: idError }

	const current = await getWebhookByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!current) return { error: 'El webhook no fue encontrado.' }
	if (current.deletedAt) return { error: 'El webhook ya está eliminado.' }

	class AlreadyDeletedError extends Error {}

	try {
		await db.transaction(async (tx) => {
			const now = new Date()
			const [deleted] = await tx
				.update(webhookEndpoints)
				.set({
					deletedAt: now,
					deletedBy: access.session.user.id,
					updatedAt: now,
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(webhookEndpoints.id, id),
						eq(
							webhookEndpoints.organizationId,
							access.membership.organizationId,
						),
						isNull(webhookEndpoints.deletedAt),
					),
				)
				.returning({ id: webhookEndpoints.id })

			if (!deleted) throw new AlreadyDeletedError()

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.WEBHOOK_DELETED,
					entityType: 'webhook',
					entityId: id,
					oldData: { deletedAt: null },
					newData: { deletedAt: now.toISOString() },
				},
				tx,
			)
		})
	} catch (e) {
		if (e instanceof AlreadyDeletedError)
			return { error: 'El webhook ya está eliminado.' }
		return {
			error: 'No se pudo eliminar el webhook. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/webhooks')
	return { success: true }
}

export async function $getDeliveriesTableAction(input: {
	page: number
	pageSize: number
	filters?: Partial<DeliveriesTableFilters>
}): Promise<GetDeliveriesTableActionResult> {
	const access = await requireAccess('webhooks.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizeDeliveriesTableFilters(),
			endpointOptions: [],
		}
	}

	const { page, pageSize } = normalizeWebhooksPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeDeliveriesTableFilters(input.filters)

	const [{ rows, totalItems }, endpointOptions] = await Promise.all([
		getDeliveriesTableForOrganization({
			organizationId: access.membership.organizationId,
			page,
			pageSize,
			filters,
		}),
		getEndpointSelectOptions(access.membership.organizationId),
	])

	return { rows, totalItems, page, pageSize, filters, endpointOptions }
}
