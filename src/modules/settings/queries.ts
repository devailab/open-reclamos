import { eq } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	organizationMembers,
	organizations,
	roles,
	ubigeos,
} from '@/database/schema'

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
	role: string
}

export interface UbigeoOption {
	id: string
	label: string
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
			role: roles.slug,
		})
		.from(organizations)
		.innerJoin(
			organizationMembers,
			eq(organizationMembers.organizationId, organizations.id),
		)
		.innerJoin(roles, eq(organizationMembers.roleId, roles.id))
		.where(eq(organizationMembers.userId, userId))
		.limit(1)

	return result ?? null
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
