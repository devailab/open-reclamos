const host = process.env.DB_HOST
const port = process.env.DB_PORT
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD
const dbName = process.env.DB_NAME

export const DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${dbName}`

export const DOCUMENT_LOOKUP_PROVIDER =
	process.env.DOCUMENT_LOOKUP_PROVIDER ?? 'JSON_PE'
export const DOCUMENT_LOOKUP_JSON_PE_TOKEN =
	process.env.DOCUMENT_LOOKUP_JSON_PE_TOKEN
export const DOCUMENT_LOOKUP_JSON_PE_URL =
	process.env.DOCUMENT_LOOKUP_JSON_PE_URL ?? 'https://api.json.pe'

const documentLookupProviderConfig = {
	JSON_PE: {
		token: DOCUMENT_LOOKUP_JSON_PE_TOKEN,
		url: DOCUMENT_LOOKUP_JSON_PE_URL,
	},
} as const

const activeDocumentLookupProviderConfig =
	documentLookupProviderConfig[
		DOCUMENT_LOOKUP_PROVIDER as keyof typeof documentLookupProviderConfig
	]

export const DOCUMENT_LOOKUP_TOKEN = activeDocumentLookupProviderConfig?.token
export const DOCUMENT_LOOKUP_URL =
	activeDocumentLookupProviderConfig?.url ?? DOCUMENT_LOOKUP_JSON_PE_URL
