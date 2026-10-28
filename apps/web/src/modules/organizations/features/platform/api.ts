import {
	OpGetPlatformOverview,
	OpListPlatformOrganizations,
	OpSetOrganizationStatus,
} from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'
import {
	DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
	type OrganizationRecord,
	type OrganizationRow,
	type PlatformOrganizationsTableFilters,
	type PlatformOverviewRecord,
} from './types'

export type OrganizationStatusChangeResult =
	| { success: true }
	| { error: string }

export function mapOrganization(row: OrganizationRecord): OrganizationRow {
	return {
		id: row.id,
		name: row.name,
		legalName: row.legal_name,
		taxId: row.tax_id,
		slug: row.slug,
		status: row.status,
		suspensionReason: row.suspension_reason,
		storeCount: row.stores_count,
		createdAt: new Date(row.created_at),
	}
}

export function mapOverview(row: PlatformOverviewRecord) {
	return {
		totalOrganizations: row.organizations ?? 0,
		suspendedOrganizations: row.suspended ?? 0,
		totalStores: row.stores ?? 0,
		totalComplaints: row.complaints ?? 0,
		totalUsers: row.users ?? 0,
	}
}

export async function getPlatformOverview(signal?: AbortSignal) {
	return mapOverview(
		await rpc<PlatformOverviewRecord>(OpGetPlatformOverview, {}, signal),
	)
}

export async function getPlatformOrganizations(
	input: {
		page: number
		pageSize: number
		filters?: PlatformOrganizationsTableFilters
	},
	signal?: AbortSignal,
) {
	const filters =
		input.filters ?? DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS

	const result = await rpc<{
		rows: OrganizationRecord[] | null
		total: number
		page: number
	}>(
		OpListPlatformOrganizations,
		{
			page: input.page,
			pageSize: input.pageSize,
			filters: { name: filters.name, status: filters.status },
		},
		signal,
	)

	return {
		rows: (Array.isArray(result.rows) ? result.rows : []).map(
			mapOrganization,
		),
		totalItems: result.total ?? 0,
		page: result.page ?? input.page,
	}
}

export async function setOrganizationStatus(
	id: string,
	status: 'active' | 'suspended',
	reason: string,
	currentPassword: string,
): Promise<OrganizationStatusChangeResult> {
	try {
		await rpc(OpSetOrganizationStatus, {
			id,
			data: {
				status,
				reason,
				current_password: currentPassword,
			},
		})

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo cambiar el estado.',
		}
	}
}

export function reactivateOrganization(id: string, currentPassword: string) {
	return setOrganizationStatus(id, 'active', '', currentPassword)
}

export function suspendOrganization(
	id: string,
	reason: string,
	currentPassword: string,
) {
	return setOrganizationStatus(id, 'suspended', reason, currentPassword)
}
