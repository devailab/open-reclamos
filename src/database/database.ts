import { drizzle } from 'drizzle-orm/bun-sql'

type DrizzleDb = ReturnType<typeof drizzle>

let _db: DrizzleDb | undefined

function getDb(): DrizzleDb {
	if (!_db) {
		const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env
		_db = drizzle(
			`postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
		)
	}
	return _db
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
	get(_, prop) {
		const instance = getDb()
		const value = Reflect.get(instance, prop)
		return typeof value === 'function' ? value.bind(instance) : value
	},
})

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
