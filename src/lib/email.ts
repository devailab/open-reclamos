import nodemailer from 'nodemailer'
import type SMTPPool from 'nodemailer/lib/smtp-pool'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { EMAIL_TRANSPORT } from '@/lib/config'

type SupportedEmailTransport = 'SMTP'
type EmailTransporter = ReturnType<typeof nodemailer.createTransport>

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off'])

let cachedTransporter: EmailTransporter | null = null

function getRequiredEnv(name: string) {
	const value = process.env[name]?.trim()
	if (!value) {
		throw new Error(`${name} no configurado`)
	}
	return value
}

function parseOptionalBooleanEnv(name: string): boolean | undefined {
	const rawValue = process.env[name]?.trim()
	if (!rawValue) return undefined

	const normalizedValue = rawValue.toLowerCase()
	if (TRUE_VALUES.has(normalizedValue)) return true
	if (FALSE_VALUES.has(normalizedValue)) return false

	throw new Error(`${name} debe ser true o false`)
}

function parseRequiredPort(name: string) {
	const value = getRequiredEnv(name)
	const parsedValue = Number.parseInt(value, 10)

	if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
		throw new Error(`${name} debe ser un número de puerto válido`)
	}

	return parsedValue
}

function getEmailTransport(): SupportedEmailTransport {
	const normalizedTransport = EMAIL_TRANSPORT.trim().toUpperCase()

	switch (normalizedTransport) {
		case 'SMTP':
			return 'SMTP'
		default:
			throw new Error(`EMAIL_TRANSPORT no soportado: ${EMAIL_TRANSPORT}`)
	}
}

function getSmtpTransportOptions(): SMTPTransport.Options | SMTPPool.Options {
	const baseOptions: SMTPTransport.Options = {
		host: getRequiredEnv('EMAIL_SMTP_HOST'),
		port: parseRequiredPort('EMAIL_SMTP_PORT'),
		secure: parseOptionalBooleanEnv('EMAIL_SMTP_SECURE') ?? false,
		ignoreTLS: parseOptionalBooleanEnv('EMAIL_SMTP_IGNORE_TLS') ?? false,
		auth: {
			user: getRequiredEnv('EMAIL_SMTP_USER'),
			pass: getRequiredEnv('EMAIL_SMTP_PASSWORD'),
		},
	}

	const poolEnabled = parseOptionalBooleanEnv('EMAIL_SMTP_POOL') ?? false
	return poolEnabled
		? ({ ...baseOptions, pool: true } satisfies SMTPPool.Options)
		: baseOptions
}

function createTransporter() {
	switch (getEmailTransport()) {
		case 'SMTP':
			return nodemailer.createTransport(getSmtpTransportOptions())
	}
}

function getDefaultFromAddress() {
	const address =
		process.env.EMAIL_FROM_ADDRESS?.trim() ||
		process.env.EMAIL_SMTP_USER?.trim()

	if (!address) {
		throw new Error(
			'EMAIL_FROM_ADDRESS no configurado y EMAIL_SMTP_USER no está disponible como respaldo',
		)
	}

	if (!address.includes('@')) {
		throw new Error(
			'EMAIL_FROM_ADDRESS debe ser un correo válido para usarlo como remitente',
		)
	}

	const name = process.env.EMAIL_FROM_NAME?.trim()

	return name ? `"${name}" <${address}>` : address
}

function getTransporter() {
	if (!cachedTransporter) {
		cachedTransporter = createTransporter()
	}

	return cachedTransporter
}

export interface SendEmailParams {
	to: string
	subject: string
	text: string
	html?: string
	attachments?: SMTPTransport.MailOptions['attachments']
}

export function getConfiguredEmailTransport() {
	return getEmailTransport()
}

export async function verifyEmailTransport() {
	await getTransporter().verify()
}

export async function sendEmail(params: SendEmailParams) {
	return getTransporter().sendMail({
		from: getDefaultFromAddress(),
		to: params.to,
		subject: params.subject,
		text: params.text,
		html: params.html,
		attachments: params.attachments,
	})
}
