'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AutocompleteOption } from '@/components/forms/autocomplete-field'
import { db } from '@/database/database'
import {
	organizationMembers,
	organizations,
	stores,
	users,
} from '@/database/schema'
import { auth } from '@/lib/auth'
import { JSON_PE_TOKEN, JSON_PE_URL } from '@/lib/config'
import {
	checkSlugExists,
	checkStoreSlugExists,
	getUbigeoByCode,
	searchUbigeos,
} from './queries'

export type RucData = {
	ruc: string
	legalName: string
	estado: string
	condicion: string
	department: string
	province: string
	district: string
	address: string
	ubigeoSunat: string
}

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

	let response: Response
	try {
		response = await fetch(`${JSON_PE_URL}/api/ruc`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${JSON_PE_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ ruc }),
		})
	} catch (e) {
		console.error('Error fetching RUC data:', e)
		return {
			success: false,
			error: 'Error de conexión al consultar el RUC. Inténtalo de nuevo.',
		}
	}

	if (response.status === 404) {
		return { success: false, error: 'RUC no encontrado en SUNAT' }
	}

	if (!response.ok) {
		return {
			success: false,
			error: 'Error al consultar el RUC. Inténtalo de nuevo.',
		}
	}

	const json = await response.json()

	if (!json.success) {
		return { success: false, error: 'RUC no encontrado en SUNAT' }
	}

	const apiData = json.data
	const ubigeo = await getUbigeoByCode(apiData.ubigeo_sunat)

	if (!ubigeo) {
		return {
			success: false,
			error: 'No se pudo verificar la ubicación del RUC. Contacta a soporte.',
		}
	}

	return {
		success: true,
		data: {
			ruc: apiData.ruc,
			legalName: apiData.nombre_o_razon_social,
			estado: apiData.estado,
			condicion: apiData.condicion,
			department: apiData.departamento,
			province: apiData.provincia,
			district: apiData.distrito,
			address: apiData.direccion,
			ubigeoSunat: apiData.ubigeo_sunat,
		},
		ubigeoId: ubigeo.id,
	}
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
		const [org] = await db
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

		await db.insert(organizationMembers).values({
			userId: session.user.id,
			organizationId: org.id,
			role: 'admin',
			createdBy: session.user.id,
		})

		await db
			.update(users)
			.set({ setupStatus: 'store' })
			.where(eq(users.id, session.user.id))
	} catch {
		return {
			error: 'Error al guardar la organización. Inténtalo de nuevo.',
		}
	}

	redirect('/setup')
}

export type SetupStoreInput = {
	organizationId: string
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

	const slug = await $getStoreSlugSuggestionAction(input.name)

	try {
		await db.insert(stores).values({
			organizationId: input.organizationId,
			name: input.name,
			slug,
			type: input.type,
			ubigeoId: input.ubigeoId,
			addressType: input.addressType,
			address: input.address,
			url: input.url,
			createdBy: session.user.id,
		})

		await db
			.update(users)
			.set({ setupStatus: 'complete' })
			.where(eq(users.id, session.user.id))
	} catch {
		return { error: 'Error al guardar la tienda. Inténtalo de nuevo.' }
	}

	redirect('/dashboard')
}
