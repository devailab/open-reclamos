import { eq, ilike, or } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	countries,
	organizationMembers,
	organizations,
	stores,
	ubigeos,
} from '@/database/schema'

export async function getCountries() {
	return db
		.select({
			id: countries.id,
			name: countries.name,
			iso2: countries.iso2,
			phoneCode: countries.phoneCode,
		})
		.from(countries)
		.orderBy(countries.name)
}

export async function getUbigeoByCode(ubigeoCode: string) {
	const result = await db
		.select()
		.from(ubigeos)
		.where(
			or(
				eq(ubigeos.ubigeo, ubigeoCode),
				eq(ubigeos.ubigeoReniec, ubigeoCode),
			),
		)
		.limit(1)
	return result[0] ?? null
}

export async function checkSlugExists(slug: string): Promise<boolean> {
	const result = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.slug, slug))
		.limit(1)
	return result.length > 0
}

export async function checkStoreSlugExists(slug: string): Promise<boolean> {
	const result = await db
		.select({ id: stores.id })
		.from(stores)
		.where(eq(stores.slug, slug))
		.limit(1)
	return result.length > 0
}

export async function searchUbigeos(query: string) {
	return db
		.select({
			id: ubigeos.id,
			district: ubigeos.district,
			province: ubigeos.province,
			department: ubigeos.department,
		})
		.from(ubigeos)
		.where(
			or(
				ilike(ubigeos.district, `%${query}%`),
				ilike(ubigeos.name, `%${query}%`),
			),
		)
		.orderBy(ubigeos.district)
		.limit(20)
}

export async function getUserOrganization(userId: string) {
	const result = await db
		.select({
			id: organizations.id,
			name: organizations.name,
		})
		.from(organizationMembers)
		.innerJoin(
			organizations,
			eq(organizationMembers.organizationId, organizations.id),
		)
		.where(eq(organizationMembers.userId, userId))
		.limit(1)
	return result[0] ?? null
}
