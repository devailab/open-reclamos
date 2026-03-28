const host = process.env.DB_HOST
const port = process.env.DB_PORT
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD
const dbName = process.env.DB_NAME

export const DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${dbName}`

export const DOCUMENT_LOOKUP_PROVIDER =
	process.env.DOCUMENT_LOOKUP_PROVIDER ?? 'JSON_PE'
