'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AutocompleteOption } from '@/components/forms/autocomplete-field'
import { db } from '@/database/database'
import {
	organizationMembers,
	organizationSettings,
	organizations,
	stores,
	users,
} from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { auth } from '@/lib/auth'
import { DOCUMENT_LOOKUP_PROVIDER } from '@/lib/config'
import {
	ensureOrganizationRoles,
	findRoleByKeyForOrganization,
} from '@/modules/rbac/queries'
import {
	getDocumentLookupProvider,
	type RucData,
	RucNotFoundError,
} from './document-lookup'
import {
	checkSlugExists,
	checkStoreSlugExists,
	getUbigeoByCode,
	getUserOrganization,
	searchUbigeos,
} from './queries'

export type LookupRucResult =
	| { success: true; data: RucData; ubigeoId: string }
	| { success: false; error: string }

export async function $lookupRucAction(ruc: string): Promise<LookupRucResult> {
	const existing = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.taxId, ruc))
		.limit(1)

	if (existing.length > 0) {
		return {
			success: false,
			error: 'Este RUC ya está registrado en la plataforma',
		}
	}

	let provider: ReturnType<typeof getDocumentLookupProvider>
	try {
		provider = getDocumentLookupProvider()
	} catch {
		return {
			success: false,
			error: `No se configuró el proveedor ${DOCUMENT_LOOKUP_PROVIDER} para consultar documentos.`,
		}
	}

	let data: RucData
	try {
		data = await provider.lookupRuc(ruc)
	} catch (e) {
		if (e instanceof RucNotFoundError) {
			return { success: false, error: 'RUC no encontrado en SUNAT' }
		}
		console.error('Error fetching RUC data:', e)
		return {
			success: false,
			error: 'Error de conexión al consultar el RUC. Inténtalo de nuevo.',
		}
	}

	const ubigeo = await getUbigeoByCode(data.ubigeoCode)

	if (!ubigeo) {
		return {
			success: false,
			error: 'No se pudo verificar la ubicación del RUC. Contacta a soporte.',
		}
	}

	return { success: true, data, ubigeoId: ubigeo.id }
}

export async function $getSlugSuggestionAction(name: string): Promise<string> {
	const base = name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)

	let slug = base
	let counter = 2

	while (await checkSlugExists(slug)) {
		slug = `${base}-${counter}`
		counter++
	}

	return slug
}

export async function $getStoreSlugSuggestionAction(
	name: string,
): Promise<string> {
	const base = name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)

	let slug = base
	let counter = 2

	while (await checkStoreSlugExists(slug)) {
		slug = `${base}-${counter}`
		counter++
	}

	return slug
}

export async function $searchUbigeosAction(
	query: string,
): Promise<AutocompleteOption[]> {
	if (!query.trim()) return []
	const results = await searchUbigeos(query)
	return results.map((u) => ({
		value: u.id,
		label: `${u.district}, ${u.province}, ${u.department}`,
	}))
}

export type SetupOrganizationInput = {
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

export type SetupActionResult = { error: string } | null

export async function $setupOrganizationAction(
	input: SetupOrganizationInput,
): Promise<SetupActionResult> {
	const session = await auth.api.getSession({ headers: await headers() })

	if (!session) {
		redirect('/login')
	}

	if (await checkSlugExists(input.slug)) {
		return { error: 'Este identificador ya está en uso. Elige otro.' }
	}

	try {
		await db.transaction(async (tx) => {
			const [org] = await tx
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
					createdBy: session.user.id,
				})
				.returning({ id: organizations.id })

			await ensureOrganizationRoles(
				{
					organizationId: org.id,
					userId: session.user.id,
				},
				tx,
			)

			const adminRole = await findRoleByKeyForOrganization(
				'organization-admin',
				org.id,
				tx,
			)
			if (!adminRole) {
				throw new Error('Base admin role not found for organization')
			}

			await tx.insert(organizationMembers).values({
				userId: session.user.id,
				organizationId: org.id,
				role: adminRole.slug,
				roleId: adminRole.id,
				createdBy: session.user.id,
			})

			await tx.insert(organizationSettings).values({
				organizationId: org.id,
				createdBy: session.user.id,
			})

			await tx
				.update(users)
				.set({ setupStatus: 'store' })
				.where(eq(users.id, session.user.id))

			await createAuditLog(
				{
					organizationId: org.id,
					userId: session.user.id,
					action: AUDIT_LOG.ORGANIZATION_CREATED,
					entityType: 'organization',
					entityId: org.id,
					newData: {
						taxId: input.ruc,
						name: input.name,
						legalName: input.legalName,
						slug: input.slug,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'Error al guardar la organización. Inténtalo de nuevo.',
		}
	}

	redirect('/setup')
}

export type SetupStoreInput = {
	name: string
	type: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
}

export async function $setupStoreAction(
	input: SetupStoreInput,
): Promise<SetupActionResult> {
	const session = await auth.api.getSession({ headers: await headers() })

	if (!session) {
		redirect('/login')
	}

	// Derivar la organización desde la membresía del usuario — nunca confiar en input del cliente
	const org = await getUserOrganization(session.user.id)
	if (!org) {
		return { error: 'No se encontró una organización asociada.' }
	}

	const slug = await $getStoreSlugSuggestionAction(input.name)

	try {
		await db.transaction(async (tx) => {
			const [store] = await tx
				.insert(stores)
				.values({
					organizationId: org.id,
					name: input.name,
					slug,
					type: input.type,
					ubigeoId: input.ubigeoId,
					addressType: input.addressType,
					address: input.address,
					url: input.url,
					createdBy: session.user.id,
				})
				.returning({ id: stores.id })

			await tx
				.update(users)
				.set({ setupStatus: 'complete' })
				.where(eq(users.id, session.user.id))

			await createAuditLog(
				{
					organizationId: org.id,
					userId: session.user.id,
					action: AUDIT_LOG.STORE_CREATED,
					entityType: 'store',
					entityId: store.id,
					newData: {
						name: input.name,
						type: input.type,
						organizationId: org.id,
					},
				},
				tx,
			)
		})
	} catch {
		return { error: 'Error al guardar la tienda. Inténtalo de nuevo.' }
	}

	redirect('/dashboard')
}
