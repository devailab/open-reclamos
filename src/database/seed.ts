import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import countriesData from './base/countries.json'

import ubigeosData from './base/ubigeos.json'
import { countries, ubigeos } from './schema'

const BATCH_SIZE = 500

type UbigeoRow = {
	ubigeo_reniec: number
	ubigeo_inei: number
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

	console.log(`[seed] ubigeos: seeding ${ubigeosData.length} records...`)

	const rows = (ubigeosData as UbigeoRow[]).map((row) => ({
		ubigeo: String(row.ubigeo_inei).padStart(6, '0'),
		ubigeoReniec: String(row.ubigeo_reniec).padStart(6, '0'),
		department: row.department,
		province: row.province,
		district: row.district,
		name: row.district,
	}))

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		await db.insert(ubigeos).values(rows.slice(i, i + BATCH_SIZE))
	}

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

	console.log(`[seed] countries: seeding ${countriesData.length} records...`)

	const rows = (countriesData as CountryRow[]).map((row) => ({
		id: row.id,
		name: row.name,
		iso2: row.iso2,
		iso3: row.iso3,
		phoneCode: row.phone_code,
		continent: row.continent,
	}))

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		await db.insert(countries).values(rows.slice(i, i + BATCH_SIZE))
	}

	console.log(`[seed] countries: done.`)
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
		console.log('[seed] completed.')
	} finally {
		await pool.end()
	}
}

main().catch((err) => {
	console.error('[seed] failed:', err)
	process.exit(1)
})
