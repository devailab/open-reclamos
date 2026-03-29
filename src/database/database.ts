import { drizzle } from 'drizzle-orm/node-postgres'
import { DATABASE_URL } from '@/lib/config'

export const db = drizzle(DATABASE_URL)

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
