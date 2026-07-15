import 'server-only'

import type { DbTransaction } from '@/database/database'
import {
	organizationMembers,
	organizationSettings,
	organizations,
	stores,
} from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import {
	assignDefaultMemberPermissionsForRole,
	ensureOrganizationRoles,
	findRoleByKeyForOrganization,
} from '@/modules/rbac/queries'

export type OrganizationSetupData = {
	ruc: string
	name: string
	legalName: string
	slug: string
	ubigeoId: string
	addressType: string
	address: string
	phoneCode: string | null
	phone: string | null
	website: string | null
}

export type StoreSetupData = {
	name: string
	type: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
}

export async function createOrganizationWithAdmin(
	tx: DbTransaction,
	input: OrganizationSetupData,
	userId: string,
): Promise<string> {
	const [organization] = await tx
		.insert(organizations)
		.values({
			taxId: input.ruc,
			name: input.name,
			legalName: input.legalName,
			slug: input.slug,
			ubigeoId: input.ubigeoId,
			addressType: input.addressType,
			address: input.address,
			phoneCode: input.phoneCode,
			phone: input.phone,
			website: input.website,
			createdBy: userId,
		})
		.returning({ id: organizations.id })

	await ensureOrganizationRoles(
		{ organizationId: organization.id, userId },
		tx,
	)

	const adminRole = await findRoleByKeyForOrganization(
		'organization-admin',
		organization.id,
		tx,
	)
	if (!adminRole) {
		throw new Error('Base admin role not found for organization')
	}

	await tx.insert(organizationMembers).values({
		userId,
		organizationId: organization.id,
		role: adminRole.slug,
		roleId: adminRole.id,
		createdBy: userId,
	})

	await assignDefaultMemberPermissionsForRole(
		{
			userId,
			organizationId: organization.id,
			roleKey: adminRole.key,
			createdBy: userId,
		},
		tx,
	)

	await tx.insert(organizationSettings).values({
		organizationId: organization.id,
		createdBy: userId,
	})

	await createAuditLog({
		organizationId: organization.id,
		userId,
		action: AUDIT_LOG.ORGANIZATION_CREATED,
		entityType: 'organization',
		entityId: organization.id,
		newData: {
			taxId: input.ruc,
			name: input.name,
			legalName: input.legalName,
			slug: input.slug,
		},
	})

	return organization.id
}

export async function createStoreForOrganization(
	tx: DbTransaction,
	organizationId: string,
	input: StoreSetupData,
	slug: string,
	userId: string,
): Promise<string> {
	const [store] = await tx
		.insert(stores)
		.values({
			organizationId,
			name: input.name,
			slug,
			type: input.type,
			ubigeoId: input.ubigeoId,
			addressType: input.addressType,
			address: input.address,
			url: input.url,
			createdBy: userId,
		})
		.returning({ id: stores.id })

	await createAuditLog({
		organizationId,
		userId,
		action: AUDIT_LOG.STORE_CREATED,
		entityType: 'store',
		entityId: store.id,
		newData: {
			name: input.name,
			type: input.type,
			organizationId,
		},
	})

	return store.id
}
