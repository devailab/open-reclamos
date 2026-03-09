import { drizzle } from 'drizzle-orm/node-postgres'
import { DATABASE_URL } from '@/lib/config'

export const db = drizzle(DATABASE_URL)
