'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/database/database'
import { organizations } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { MESSAGES } from '@/modules/shared/messages'
import type { ActionResult } from '@/modules/shared/types'
import { requirePlatformAdmin } from './access'
import {
	ORGANIZATION_STATUS_ACTIVE,
	ORGANIZATION_STATUS_SUSPENDED,
} from './constants'
import {
	getOrganizationForPlatform,
	getOrganizationsTableForPlatform,
	type PlatformOrganizationRow,
} from './queries'
import {
	DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
	normalizePlatformOrganizationsTableFilters,
	normalizePlatformPagination,
	normalizeSuspensionReason,
	type PlatformOrganizationsTableFilters,
	validateOrganizationId,
	validateSuspensionReason,
} from './validation'

export interface GetPlatformOrganizationsTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<PlatformOrganizationsTableFilters>
}

export interface GetPlatformOrganizationsTableActionResult {
	rows: PlatformOrganizationRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: PlatformOrganizationsTableFilters
}

export async function $getPlatformOrganizationsTableAction(
	input: GetPlatformOrganizationsTableActionInput,
): Promise<GetPlatformOrganizationsTableActionResult> {
	const access = await requirePlatformAdmin()
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
		}
	}

	const { page, pageSize } = normalizePlatformPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizePlatformOrganizationsTableFilters(input.filters)

	const { rows, totalItems } = await getOrganizationsTableForPlatform({
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

const revalidatePlatformSurfaces = () => {
	revalidatePath('/dashboard/platform')
	revalidatePath('/dashboard')
	revalidatePath('/c/[slug]', 'page')
	revalidatePath('/s/[slug]', 'page')
}

export async function $suspendOrganizationAction(
	organizationId: string,
	reason: string,
): Promise<ActionResult> {
	const access = await requirePlatformAdmin()
	if ('error' in access) return { error: access.error }

	const idError = validateOrganizationId(organizationId)
	if (idError) return { error: idError }

	const normalizedReason = normalizeSuspensionReason(reason)
	const reasonError = validateSuspensionReason(normalizedReason)
	if (reasonError) return { error: reasonError }

	const organization = await getOrganizationForPlatform(organizationId)
	if (!organization) {
		return { error: MESSAGES.platform.organizationNotFound }
	}
	if (organization.status === ORGANIZATION_STATUS_SUSPENDED) {
		return { error: MESSAGES.platform.alreadyInStatus }
	}

	try {
		await db.transaction(async (tx) => {
			const now = new Date()
			const [updated] = await tx
				.update(organizations)
				.set({
					status: ORGANIZATION_STATUS_SUSPENDED,
					suspendedAt: now,
					suspendedBy: access.session.user.id,
					suspensionReason: normalizedReason,
					updatedAt: now,
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(organizations.id, organizationId),
						eq(organizations.status, ORGANIZATION_STATUS_ACTIVE),
					),
				)
				.returning({ id: organizations.id })

			// El guard de estado va en el WHERE del UPDATE: un pre-check no es
			// atómico con la escritura.
			if (!updated) {
				throw new Error('organization already suspended')
			}

			await createAuditLog({
				organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.ORGANIZATION_SUSPENDED,
				entityType: 'organization',
				entityId: organizationId,
				oldData: { status: organization.status },
				newData: {
					status: ORGANIZATION_STATUS_SUSPENDED,
					suspensionReason: normalizedReason,
				},
				description: normalizedReason,
			})
		})
	} catch {
		return { error: MESSAGES.platform.statusUpdateFailed }
	}

	revalidatePlatformSurfaces()
	return { success: true }
}

export async function $reactivateOrganizationAction(
	organizationId: string,
): Promise<ActionResult> {
	const access = await requirePlatformAdmin()
	if ('error' in access) return { error: access.error }

	const idError = validateOrganizationId(organizationId)
	if (idError) return { error: idError }

	const organization = await getOrganizationForPlatform(organizationId)
	if (!organization) {
		return { error: MESSAGES.platform.organizationNotFound }
	}
	if (organization.status === ORGANIZATION_STATUS_ACTIVE) {
		return { error: MESSAGES.platform.alreadyInStatus }
	}

	try {
		await db.transaction(async (tx) => {
			const now = new Date()
			const [updated] = await tx
				.update(organizations)
				.set({
					status: ORGANIZATION_STATUS_ACTIVE,
					suspendedAt: null,
					suspendedBy: null,
					suspensionReason: null,
					updatedAt: now,
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(organizations.id, organizationId),
						eq(organizations.status, ORGANIZATION_STATUS_SUSPENDED),
					),
				)
				.returning({ id: organizations.id })

			if (!updated) {
				throw new Error('organization already active')
			}

			await createAuditLog({
				organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.ORGANIZATION_REACTIVATED,
				entityType: 'organization',
				entityId: organizationId,
				oldData: {
					status: organization.status,
					suspensionReason: organization.suspensionReason,
				},
				newData: { status: ORGANIZATION_STATUS_ACTIVE },
			})
		})
	} catch {
		return { error: MESSAGES.platform.statusUpdateFailed }
	}

	revalidatePlatformSurfaces()
	return { success: true }
}
