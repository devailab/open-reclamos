export const APP_NAME = process.env.APP_NAME ?? 'Open Reclamos'

export const DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?application_name=${APP_NAME}`

export const DOCUMENT_LOOKUP_PROVIDER =
	process.env.DOCUMENT_LOOKUP_PROVIDER ?? 'JSON_PE'

export const EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT ?? 'SMTP'

export const ALLOW_PUBLIC_REGISTRATION =
	process.env.ALLOW_PUBLIC_REGISTRATION === 'true'

export const EMAIL_VERIFICATION_ENABLED =
	process.env.EMAIL_VERIFICATION_ENABLED === 'true'

export const BETTER_AUTH_URL =
	process.env.BETTER_AUTH_URL?.trim() || 'http://localhost:3000'

export const SSO_ENABLED = process.env.SSO_ENABLED === 'true'

function getRequiredSsoEnvironmentVariable(name: string): string {
	const value = process.env[name]?.trim()
	if (SSO_ENABLED && !value) {
		throw new Error(`${name} is required when SSO_ENABLED=true`)
	}

	return value ?? ''
}

export const SSO_PROVIDER_ID =
	process.env.SSO_PROVIDER_ID?.trim() || 'open-reclamos-sso'
export const SSO_PROVIDER_NAME =
	process.env.SSO_PROVIDER_NAME?.trim() || 'SSO corporativo'
export const SSO_CLIENT_ID = getRequiredSsoEnvironmentVariable('SSO_CLIENT_ID')
export const SSO_CLIENT_SECRET =
	getRequiredSsoEnvironmentVariable('SSO_CLIENT_SECRET')
export const SSO_DISCOVERY_URL =
	getRequiredSsoEnvironmentVariable('SSO_DISCOVERY_URL')
export const SSO_SCOPES = (process.env.SSO_SCOPES ?? 'openid,email,profile')
	.split(',')
	.map((scope) => scope.trim())
	.filter(Boolean)
// URL del proveedor de identidad donde el usuario administra su cuenta (perfil, contraseña, MFA)
export const SSO_ACCOUNT_URL = process.env.SSO_ACCOUNT_URL?.trim() || ''
