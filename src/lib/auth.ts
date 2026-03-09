import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { v7 as uuidv7 } from 'uuid'
import { db } from '@/database/database'
import * as schema from '@/database/schema'

export const auth = betterAuth({
	advanced: {
		database: {
			generateId: () => uuidv7(),
		},
	},
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			...schema,
			user: schema.users,
			verification: schema.verifications,
			session: schema.sessions,
			account: schema.accounts,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [nextCookies()],
})
