import { eq } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	organizationMembers,
	organizationSettings,
	organizations,
	roles,
	ubigeos,
} from '@/database/schema'
import { DEFAULT_RESPONSE_DEADLINE_DAYS } from '@/lib/constants'

export interface OrganizationSettings {
	id: string
	slug: string
	name: string
	legalName: string
	taxId: string
	ubigeoId: string
	addressType: string
	address: string
	phoneCode: string | null
	phone: string | null
	website: string | null
	formEnabled: boolean
	aiClassificationEnabled: boolean
	aiOrganizationContext: string | null
	responseDeadlineDays: number
	role: string
}

export interface UbigeoOption {
	id: string
	label: string
}

export interface OrganizationComplaintSettings {
	formEnabled: boolean
	aiClassificationEnabled: boolean
	aiOrganizationContext: string | null
	responseDeadlineDays: number
}

export async function getOrganizationSettingsForUser(
	userId: string,
): Promise<OrganizationSettings | null> {
	const [result] = await db
		.select({
			id: organizations.id,
			slug: organizations.slug,
			name: organizations.name,
			legalName: organizations.legalName,
			taxId: organizations.taxId,
			ubigeoId: organizations.ubigeoId,
			addressType: organizations.addressType,
			address: organizations.address,
			phoneCode: organizations.phoneCode,
			phone: organizations.phone,
			website: organizations.website,
			formEnabled: organizationSettings.formEnabled,
			aiClassificationEnabled:
				organizationSettings.aiClassificationEnabled,
			aiOrganizationContext: organizationSettings.aiOrganizationContext,
			responseDeadlineDays: organizationSettings.responseDeadlineDays,
			role: roles.slug,
		})
		.from(organizations)
		.innerJoin(
			organizationMembers,
			eq(organizationMembers.organizationId, organizations.id),
		)
		.innerJoin(roles, eq(organizationMembers.roleId, roles.id))
		.leftJoin(
			organizationSettings,
			eq(organizationSettings.organizationId, organizations.id),
		)
		.where(eq(organizationMembers.userId, userId))
		.limit(1)

	if (!result) return null

	return {
		...result,
		formEnabled: result.formEnabled ?? true,
		aiClassificationEnabled: result.aiClassificationEnabled ?? false,
		aiOrganizationContext: result.aiOrganizationContext ?? null,
		responseDeadlineDays:
			result.responseDeadlineDays ?? DEFAULT_RESPONSE_DEADLINE_DAYS,
	}
}

export async function getOrganizationComplaintSettingsForOrganization(
	organizationId: string,
): Promise<OrganizationComplaintSettings> {
	const [result] = await db
		.select({
			formEnabled: organizationSettings.formEnabled,
			aiClassificationEnabled:
				organizationSettings.aiClassificationEnabled,
			aiOrganizationContext: organizationSettings.aiOrganizationContext,
			responseDeadlineDays: organizationSettings.responseDeadlineDays,
		})
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, organizationId))
		.limit(1)

	return {
		formEnabled: result?.formEnabled ?? true,
		aiClassificationEnabled: result?.aiClassificationEnabled ?? false,
		aiOrganizationContext: result?.aiOrganizationContext ?? null,
		responseDeadlineDays:
			result?.responseDeadlineDays ?? DEFAULT_RESPONSE_DEADLINE_DAYS,
	}
}

export async function getUbigeoById(
	ubigeoId: string,
): Promise<UbigeoOption | null> {
	const [result] = await db
		.select({
			id: ubigeos.id,
			district: ubigeos.district,
			province: ubigeos.province,
			department: ubigeos.department,
		})
		.from(ubigeos)
		.where(eq(ubigeos.id, ubigeoId))
		.limit(1)

	if (!result) return null

	return {
		id: result.id,
		label: `${result.district}, ${result.province}, ${result.department}`,
	}
}
