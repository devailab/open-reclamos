import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { emailOTP } from 'better-auth/plugins'
import { db } from '@/database/database'
import * as schema from '@/database/schema'
import { sendEmail } from '@/lib/email'

function buildOtpEmailHtml(otp: string): string {
	return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="font-family:sans-serif;color:#111;max-width:480px;margin:0 auto;padding:24px;">
  <p>Tu código de verificación para crear tu cuenta es:</p>
  <p style="font-size:2rem;font-weight:bold;letter-spacing:0.4em;margin:24px 0;">${otp}</p>
  <p>El código expira en <strong>10 minutos</strong>.</p>
  <p>Si no solicitaste esto, puedes ignorar este mensaje.</p>
</body>
</html>`
}

function buildOtpEmailText(otp: string): string {
	return [
		`Tu código de verificación es: ${otp}`,
		'El código expira en 10 minutos.',
		'Si no solicitaste esto, ignora este mensaje.',
	].join('\n\n')
}

export const auth = betterAuth({
	advanced: {
		database: {
			generateId: () => Bun.randomUUIDv7(),
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
	plugins: [
		nextCookies(),
		emailOTP({
			sendVerificationOnSignUp: false,
			otpLength: 6,
			expiresIn: 600,
			allowedAttempts: 5,
			resendStrategy: 'rotate',
			storeOTP: 'hashed',
			sendVerificationOTP: async ({ email, otp, type }) => {
				if (type !== 'email-verification') return
				await sendEmail({
					to: email,
					subject: 'Tu código de verificación',
					text: buildOtpEmailText(otp),
					html: buildOtpEmailHtml(otp),
				})
			},
		}),
	],
})
