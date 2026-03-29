import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import countriesData from './base/countries.json'
import rbacData from './base/rbac.json'

import ubigeosData from './base/ubigeos.json'
import { countries, permissions, ubigeos } from './schema'

const BATCH_SIZE = 500

type UbigeoRow = {
	ubigeo_reniec: number
	ubigeo_inei: number | ''
	department: string
	province: string
	district: string
}

type CountryRow = {
	id: string
	name: string
	iso2: string
	iso3: string
	phone_code: string
	continent: string
}

type PermissionSeedRow = {
	key: string
	slug: string
	module: string
	name: string
	description: string
}

async function seedUbigeos(db: ReturnType<typeof drizzle>) {
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(ubigeos)

	if (count > 0) {
		console.log(
			`[seed] ubigeos: already seeded (${count} records), skipping.`,
		)
		return
	}

	const rows = (ubigeosData as UbigeoRow[])
		.filter((row) => row.ubigeo_inei !== '')
		.map((row) => ({
			ubigeo: String(row.ubigeo_inei).padStart(6, '0'),
			ubigeoReniec: String(row.ubigeo_reniec).padStart(6, '0'),
			department: row.department,
			province: row.province,
			district: row.district,
			name: row.district,
		}))

	console.log(`[seed] ubigeos: seeding ${rows.length} records...`)

	await db.transaction(async (tx) => {
		for (let i = 0; i < rows.length; i += BATCH_SIZE) {
			await tx.insert(ubigeos).values(rows.slice(i, i + BATCH_SIZE))
		}
	})

	console.log(`[seed] ubigeos: done.`)
}

async function seedCountries(db: ReturnType<typeof drizzle>) {
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(countries)

	if (count > 0) {
		console.log(
			`[seed] countries: already seeded (${count} records), skipping.`,
		)
		return
	}

	const rows = (countriesData as CountryRow[]).map((row) => ({
		id: row.id,
		name: row.name,
		iso2: row.iso2,
		iso3: row.iso3,
		phoneCode: row.phone_code,
		continent: row.continent,
	}))

	console.log(`[seed] countries: seeding ${rows.length} records...`)

	await db.transaction(async (tx) => {
		for (let i = 0; i < rows.length; i += BATCH_SIZE) {
			await tx.insert(countries).values(rows.slice(i, i + BATCH_SIZE))
		}
	})

	console.log(`[seed] countries: done.`)
}

// Solo sincroniza los permisos del sistema (globales, isSystem = true).
// Los roles y role_permissions se crean por organización durante el setup.
async function seedRbac(db: ReturnType<typeof drizzle>) {
	const permissionDefs = (rbacData.permissions as PermissionSeedRow[]).map(
		(row) => ({
			key: row.key,
			slug: row.slug,
			module: row.module,
			name: row.name,
			description: row.description,
			isSystem: true,
		}),
	)

	await db
		.insert(permissions)
		.values(permissionDefs)
		.onConflictDoNothing({ target: permissions.key })

	console.log(
		`[seed] permissions: ensured ${permissionDefs.length} system permissions.`,
	)
}

async function main() {
	const pool = new Pool({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	})

	const db = drizzle(pool)

	try {
		await seedCountries(db)
		await seedUbigeos(db)
		await seedRbac(db)
		console.log('[seed] completed.')
	} finally {
		await pool.end()
	}
}

main().catch((err) => {
	console.error('[seed] failed:', err)
	process.exit(1)
})
