export const DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`

export const DOCUMENT_LOOKUP_PROVIDER =
	process.env.DOCUMENT_LOOKUP_PROVIDER ?? 'JSON_PE'

export const EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT ?? 'SMTP'
