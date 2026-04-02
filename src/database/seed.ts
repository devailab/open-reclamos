import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import countriesData from './base/countries.json'
import rbacData from './base/rbac.json'

import ubigeosData from './base/ubigeos.json'
import {
	countries,
	permissions,
	rolePermissions,
	roles,
	ubigeos,
} from './schema'

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

// Sincroniza permisos del sistema y asigna los nuevos permisos a los roles
// existentes de cada organización según la definición en rbac.json.
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
		.onConflictDoUpdate({
			target: permissions.key,
			set: {
				name: sql`excluded.name`,
				description: sql`excluded.description`,
				module: sql`excluded.module`,
				slug: sql`excluded.slug`,
			},
		})

	console.log(
		`[seed] permissions: synced ${permissionDefs.length} system permissions.`,
	)

	const allPermissions = await db
		.select({ id: permissions.id, key: permissions.key })
		.from(permissions)
		.where(isNull(permissions.deletedAt))

	const permissionIdByKey = Object.fromEntries(
		allPermissions.map((p) => [p.key, p.id]),
	)

	// Para cada rol definido en rbac.json, buscar todos los roles de organización
	// con ese key y asignar los permisos faltantes.
	for (const roleDef of rbacData.roles) {
		const expectedPermissionIds = roleDef.permissionKeys
			.map((k) => permissionIdByKey[k])
			.filter(Boolean) as string[]

		if (expectedPermissionIds.length === 0) continue

		// Todos los roles de organización con este key (no soft-deleted).
		const matchingRoles = await db
			.select({ id: roles.id })
			.from(roles)
			.where(and(eq(roles.key, roleDef.key), isNull(roles.deletedAt)))

		if (matchingRoles.length === 0) continue

		const roleIds = matchingRoles.map((r) => r.id)

		for (const roleId of roleIds) {
			const existing = await db
				.select({ permissionId: rolePermissions.permissionId })
				.from(rolePermissions)
				.where(
					and(
						eq(rolePermissions.roleId, roleId),
						inArray(
							rolePermissions.permissionId,
							expectedPermissionIds,
						),
					),
				)

			const existingIds = new Set(existing.map((r) => r.permissionId))
			const missing = expectedPermissionIds.filter(
				(id) => !existingIds.has(id),
			)

			if (missing.length === 0) continue

			await db
				.insert(rolePermissions)
				.values(
					missing.map((permissionId) => ({ roleId, permissionId })),
				)
		}
	}

	console.log(
		'[seed] role_permissions: synced missing assignments for all orgs.',
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
