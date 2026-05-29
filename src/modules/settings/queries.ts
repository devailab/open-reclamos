import { eq } from 'drizzle-orm'
import { db } from '@/database/database'
import { organizationSettings, organizations, ubigeos } from '@/database/schema'
import { DEFAULT_RESPONSE_DEADLINE_DAYS } from '@/lib/constants'
import { getMembershipContext } from '@/modules/rbac/queries'

export interface OrganizationSettings {
	id: string
	slug: string
	name: string
	legalName: string
	taxId: string
	logoKey: string | null
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
	mcpEnabledTools: string | null
	mcpShowSensitiveData: boolean
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
	const membership = await getMembershipContext(userId)
	if (!membership) return null

	return getOrganizationSettingsForOrganization(membership.organizationId)
}

export async function getOrganizationSettingsForOrganization(
	organizationId: string,
): Promise<OrganizationSettings | null> {
	const [result] = await db
		.select({
			id: organizations.id,
			slug: organizations.slug,
			name: organizations.name,
			legalName: organizations.legalName,
			taxId: organizations.taxId,
			logoKey: organizations.logoKey,
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
			mcpEnabledTools: organizationSettings.mcpEnabledTools,
			mcpShowSensitiveData: organizationSettings.mcpShowSensitiveData,
		})
		.from(organizations)
		.leftJoin(
			organizationSettings,
			eq(organizationSettings.organizationId, organizations.id),
		)
		.where(eq(organizations.id, organizationId))
		.limit(1)

	if (!result) return null

	return {
		...result,
		formEnabled: result.formEnabled ?? true,
		aiClassificationEnabled: result.aiClassificationEnabled ?? false,
		aiOrganizationContext: result.aiOrganizationContext ?? null,
		responseDeadlineDays:
			result.responseDeadlineDays ?? DEFAULT_RESPONSE_DEADLINE_DAYS,
		mcpEnabledTools: result.mcpEnabledTools ?? null,
		mcpShowSensitiveData: result.mcpShowSensitiveData ?? true,
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

export interface OrganizationMcpSettings {
	mcpEnabledTools: string | null
	mcpShowSensitiveData: boolean
}

export async function getOrganizationMcpSettings(
	organizationId: string,
): Promise<OrganizationMcpSettings> {
	const [result] = await db
		.select({
			mcpEnabledTools: organizationSettings.mcpEnabledTools,
			mcpShowSensitiveData: organizationSettings.mcpShowSensitiveData,
		})
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, organizationId))
		.limit(1)

	return {
		mcpEnabledTools: result?.mcpEnabledTools ?? null,
		mcpShowSensitiveData: result?.mcpShowSensitiveData ?? true,
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
