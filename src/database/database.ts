import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { DATABASE_URL } from '@/lib/config'

type DrizzleDb = ReturnType<typeof drizzle>

let _db: DrizzleDb | undefined

function getDb(): DrizzleDb {
	if (!_db) {
		const client = postgres(DATABASE_URL)
		_db = drizzle({ client })
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
