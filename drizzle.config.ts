import { defineConfig } from 'drizzle-kit'

const host = process.env.DB_HOST
const port = process.env.DB_PORT
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD
const dbName = process.env.DB_NAME

const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${dbName}`

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/database/schema.ts',
	out: './src/database/migrations',
	dbCredentials: {
		url: databaseUrl,
	},
})
