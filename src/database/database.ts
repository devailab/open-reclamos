import { drizzle } from 'drizzle-orm/bun-sql'
import { DATABASE_URL } from '@/lib/config'

type DrizzleDb = ReturnType<typeof drizzle>

let _db: DrizzleDb | undefined

function getDb(): DrizzleDb {
	if (!_db) {
		_db = drizzle(DATABASE_URL)
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
