const host = process.env.DB_HOST
const port = process.env.DB_PORT
const user = process.env.DB_USER
const password = process.env.DB_PASSWORD
const dbName = process.env.DB_NAME

export const DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${dbName}`

export const JSON_PE_TOKEN = process.env.JSON_PE_TOKEN
export const JSON_PE_URL = process.env.JSON_PE_URL ?? 'https://api.json.pe'
