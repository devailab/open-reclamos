'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/database/database'
import { webhookEndpoints } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { buildSlugBase, resolveUniqueSlug } from '@/lib/slug'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import type { ActionResult } from '@/modules/shared/types'
import {
	checkWebhookSlugExists,
	getDeliveriesTableForOrganization,
	getEndpointSelectOptions,
	getWebhookByIdForOrganization,
	getWebhooksTableForOrganization,
	type WebhookDeliveryRow,
	type WebhookEndpointRow,
} from './queries'
import { encryptWebhookSecret } from './secret'
import { assertPublicWebhookUrl, UnsafeWebhookUrlError } from './ssrf'
import {
	type DeliveriesTableFilters,
	normalizeDeliveriesTableFilters,
	normalizeWebhookMutationInput,
	normalizeWebhooksPagination,
	normalizeWebhooksTableFilters,
	validateWebhookId,
	validateWebhookMutationInput,
	validateWebhookSecret,
	type WebhookMutationInput,
	type WebhooksTableFilters,
} from './validation'

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

const getUniqueWebhookSlug = (
	name: string,
	organizationId: string,
): Promise<string> =>
	resolveUniqueSlug(buildSlugBase(name, 'webhook'), (slug) =>
		checkWebhookSlugExists(slug, organizationId),
	)

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
): Promise<ActionResult> {
	const access = await requireAccess('webhooks.manage')
	if ('error' in access) return { error: access.error }

	const normalized = normalizeWebhookMutationInput(input)
	const validationError = validateWebhookMutationInput(normalized)
	if (validationError) return { error: validationError }

	const secretError = validateWebhookSecret(normalized.secret)
	if (secretError) return { error: secretError }

	// Verificación DNS anti-SSRF: el destino debe resolver a IPs públicas
	try {
		await assertPublicWebhookUrl(normalized.targetUrl)
	} catch (error) {
		if (error instanceof UnsafeWebhookUrlError) {
			return { error: error.message }
		}
		return { error: MESSAGES.webhooks.createFailed }
	}

	const slug = await getUniqueWebhookSlug(
		normalized.name,
		access.membership.organizationId,
	)

	try {
		const secretEncrypted = encryptWebhookSecret(normalized.secret)

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
					secretEncrypted,
					createdBy: access.session.user.id,
				})
				.returning({ id: webhookEndpoints.id })

			await createAuditLog({
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
			})
		})
	} catch {
		return { error: MESSAGES.webhooks.createFailed }
	}

	revalidatePath('/dashboard/webhooks')
	return { success: true }
}

export type UpdateWebhookActionInput = WebhookMutationInput & { id: string }

export async function $updateWebhookAction(
	input: UpdateWebhookActionInput,
): Promise<ActionResult> {
	const access = await requireAccess('webhooks.manage')
	if ('error' in access) return { error: access.error }

	const idError = validateWebhookId(input.id)
	if (idError) return { error: idError }

	const current = await getWebhookByIdForOrganization(
		input.id,
		access.membership.organizationId,
	)
	if (!current) return { error: MESSAGES.webhooks.notFound }
	if (current.deletedAt)
		return { error: MESSAGES.webhooks.deletedNotEditable }

	const normalized = normalizeWebhookMutationInput(input)
	const validationError = validateWebhookMutationInput(normalized)
	if (validationError) return { error: validationError }

	// Secreto vacío = conservar el actual; con valor, se rota por el nuevo
	const rotatesSecret = normalized.secret.length > 0
	if (rotatesSecret) {
		const secretError = validateWebhookSecret(normalized.secret)
		if (secretError) return { error: secretError }
	}

	// Verificación DNS anti-SSRF: el destino debe resolver a IPs públicas
	try {
		await assertPublicWebhookUrl(normalized.targetUrl)
	} catch (error) {
		if (error instanceof UnsafeWebhookUrlError) {
			return { error: error.message }
		}
		return { error: MESSAGES.webhooks.updateFailed }
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(webhookEndpoints)
				.set({
					name: normalized.name,
					targetUrl: normalized.targetUrl,
					events: normalized.events,
					status: normalized.status,
					...(rotatesSecret && {
						secretEncrypted: encryptWebhookSecret(
							normalized.secret,
						),
					}),
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

			await createAuditLog({
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
			})

			if (rotatesSecret) {
				await createAuditLog({
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.WEBHOOK_SECRET_REGENERATED,
					entityType: 'webhook',
					entityId: input.id,
				})
			}
		})
	} catch {
		return {
			error: MESSAGES.webhooks.updateFailed,
		}
	}

	revalidatePath('/dashboard/webhooks')
	return { success: true }
}

export async function $deleteWebhookAction(id: string): Promise<ActionResult> {
	const access = await requireAccess('webhooks.manage')
	if ('error' in access) return { error: access.error }

	const idError = validateWebhookId(id)
	if (idError) return { error: idError }

	const current = await getWebhookByIdForOrganization(
		id,
		access.membership.organizationId,
	)
	if (!current) return { error: MESSAGES.webhooks.notFound }
	if (current.deletedAt) return { error: MESSAGES.webhooks.alreadyDeleted }

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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.WEBHOOK_DELETED,
				entityType: 'webhook',
				entityId: id,
				oldData: { deletedAt: null },
				newData: { deletedAt: now.toISOString() },
			})
		})
	} catch (e) {
		if (e instanceof AlreadyDeletedError)
			return { error: MESSAGES.webhooks.alreadyDeleted }
		return {
			error: MESSAGES.webhooks.deleteFailed,
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
