const TURNSTILE_VERIFY_URL =
	'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstileToken(
	token: string,
	remoteip?: string,
): Promise<boolean> {
	const secretKey = process.env.TURNSTILE_SECRET_KEY
	if (!secretKey) {
		console.warn('[turnstile] TURNSTILE_SECRET_KEY no está configurado')
		return true
	}

	const body = new URLSearchParams({ secret: secretKey, response: token })
	if (remoteip) body.set('remoteip', remoteip)

	const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body })
	if (!res.ok) return false

	const data = (await res.json()) as { success: boolean }
	return data.success === true
}
