'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AutocompleteOption } from '@/components/forms/autocomplete-field'
import { db } from '@/database/database'
import { organizations, users } from '@/database/schema'
import { auth } from '@/lib/auth'
import { DOCUMENT_LOOKUP_PROVIDER } from '@/lib/config'
import { buildSlugBase, resolveUniqueSlug } from '@/lib/slug'
import { setActiveOrganizationCookie } from '@/modules/rbac/cookies'
import { getMembershipContext } from '@/modules/rbac/queries'
import { MESSAGES } from '@/modules/shared/messages'
import { checkStoreSlugExists } from '@/modules/stores/queries'
import {
	getDocumentLookupProvider,
	type RucData,
	RucNotFoundError,
} from './document-lookup'
import {
	checkSlugExists,
	getUbigeoByCode,
	getUserOrganization,
	searchUbigeos,
} from './queries'
import {
	createOrganizationWithAdmin,
	createStoreForOrganization,
} from './service'

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
			error: MESSAGES.setup.rucAlreadyRegisteredShort,
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
			return { success: false, error: MESSAGES.setup.rucNotFound }
		}
		console.error('Error fetching RUC data:', e)
		return {
			success: false,
			error: MESSAGES.setup.rucLookupFailed,
		}
	}

	const ubigeo = await getUbigeoByCode(data.ubigeoCode)

	if (!ubigeo) {
		return {
			success: false,
			error: MESSAGES.setup.rucLocationUnverified,
		}
	}

	return { success: true, data, ubigeoId: ubigeo.id }
}

export async function $getSlugSuggestionAction(name: string): Promise<string> {
	return resolveUniqueSlug(buildSlugBase(name), checkSlugExists)
}

export async function $getStoreSlugSuggestionAction(
	name: string,
): Promise<string> {
	return resolveUniqueSlug(buildSlugBase(name), checkStoreSlugExists)
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

async function getUserSetupStatus(userId: string) {
	const [user] = await db
		.select({
			setupStatus: users.setupStatus,
			pendingOrganizationId: users.pendingOrganizationId,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	return (
		user ?? {
			setupStatus: null,
			pendingOrganizationId: null,
		}
	)
}

export type CompleteSetupInput = {
	organization: SetupOrganizationInput
	store: SetupStoreInput
}

export async function $completeSetupAction(
	input: CompleteSetupInput,
): Promise<SetupActionResult> {
	const session = await auth.api.getSession({ headers: await headers() })

	if (!session) {
		redirect('/login')
	}

	if (await checkSlugExists(input.organization.slug)) {
		return { error: MESSAGES.setup.slugTaken }
	}

	const [existingRuc] = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.taxId, input.organization.ruc))
		.limit(1)
	if (existingRuc) {
		return { error: MESSAGES.setup.rucAlreadyRegistered }
	}

	const storeSlug = await $getStoreSlugSuggestionAction(input.store.name)
	let organizationId: string | null = null

	try {
		organizationId = await db.transaction(async (tx) => {
			const createdOrganizationId = await createOrganizationWithAdmin(
				tx,
				input.organization,
				session.user.id,
			)

			await createStoreForOrganization(
				tx,
				createdOrganizationId,
				input.store,
				storeSlug,
				session.user.id,
			)

			await tx
				.update(users)
				.set({ setupStatus: 'complete', pendingOrganizationId: null })
				.where(eq(users.id, session.user.id))

			return createdOrganizationId
		})
	} catch {
		return {
			error: MESSAGES.setup.organizationSaveFailed,
		}
	}

	if (!organizationId) {
		return {
			error: MESSAGES.setup.organizationSaveFailed,
		}
	}

	await setActiveOrganizationCookie(organizationId)
	redirect('/dashboard')
}

async function resolveSetupStoreOrganizationId(
	userId: string,
	setupStatus: string | null,
	pendingOrganizationId: string | null,
) {
	if (
		pendingOrganizationId &&
		(await getMembershipContext(userId, pendingOrganizationId))
	) {
		return pendingOrganizationId
	}

	if (setupStatus === 'complete') {
		return null
	}

	const organization = await getUserOrganization(userId)
	return organization?.id ?? null
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

	const userState = await getUserSetupStatus(session.user.id)
	const organizationId = await resolveSetupStoreOrganizationId(
		session.user.id,
		userState.setupStatus,
		userState.pendingOrganizationId,
	)
	if (!organizationId) {
		return {
			error: MESSAGES.setup.pendingOrganizationNotFound,
		}
	}

	const slug = await $getStoreSlugSuggestionAction(input.name)

	try {
		await db.transaction(async (tx) => {
			await createStoreForOrganization(
				tx,
				organizationId,
				input,
				slug,
				session.user.id,
			)

			if (userState.setupStatus !== 'complete') {
				await tx
					.update(users)
					.set({
						setupStatus: 'complete',
						pendingOrganizationId: null,
					})
					.where(eq(users.id, session.user.id))
			} else {
				await tx
					.update(users)
					.set({ pendingOrganizationId: null })
					.where(eq(users.id, session.user.id))
			}
		})
	} catch {
		return { error: MESSAGES.setup.storeSaveFailed }
	}

	await setActiveOrganizationCookie(organizationId)
	redirect('/dashboard')
}
