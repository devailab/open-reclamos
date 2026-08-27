import 'server-only'

import { eq } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/database/database'
import { organizations } from '@/database/schema'
import {
	ORGANIZATION_STATUS_ACTIVE,
	type OrganizationStatus,
} from './constants'

/**
 * Estado de plataforma de una organización. Se consulta desde superficies
 * públicas y autenticadas para cortar el acceso de un tenant suspendido,
 * por eso no exige el guard de super admin.
 */
export const getOrganizationStatus = cache(
	async (organizationId: string): Promise<OrganizationStatus | null> => {
		const [organization] = await db
			.select({ status: organizations.status })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1)

		return (organization?.status as OrganizationStatus) ?? null
	},
)

export const isOrganizationActive = async (
	organizationId: string,
): Promise<boolean> => {
	const status = await getOrganizationStatus(organizationId)
	return status === ORGANIZATION_STATUS_ACTIVE
}

export interface OrganizationSuspensionDetails {
	suspendedAt: Date | null
	suspensionReason: string | null
}

/**
 * Detalle de la suspensión para mostrar al tenant. Retorna `null` cuando la
 * organización está activa.
 */
export const getOrganizationSuspensionDetails = cache(
	async (
		organizationId: string,
	): Promise<OrganizationSuspensionDetails | null> => {
		const [organization] = await db
			.select({
				status: organizations.status,
				suspendedAt: organizations.suspendedAt,
				suspensionReason: organizations.suspensionReason,
			})
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1)

		if (
			!organization ||
			organization.status === ORGANIZATION_STATUS_ACTIVE
		) {
			return null
		}

		return {
			suspendedAt: organization.suspendedAt,
			suspensionReason: organization.suspensionReason,
		}
	},
)
