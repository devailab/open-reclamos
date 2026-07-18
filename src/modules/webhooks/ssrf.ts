import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isPrivateIp, validateWebhookUrlSyntax } from './url-validation'

const MAX_REDIRECTS = 3

export class UnsafeWebhookUrlError extends Error {}

/**
 * Valida que el hostname de la URL resuelva únicamente a IPs públicas.
 * Lanza UnsafeWebhookUrlError si la URL apunta a un recurso interno.
 */
export async function assertPublicWebhookUrl(rawUrl: string): Promise<void> {
	const syntaxError = validateWebhookUrlSyntax(rawUrl)
	if (syntaxError) throw new UnsafeWebhookUrlError(syntaxError)

	const hostname = new URL(rawUrl).hostname.replace(/^\[|\]$/g, '')

	if (isIP(hostname)) {
		if (isPrivateIp(hostname)) {
			throw new UnsafeWebhookUrlError(
				'La URL de destino no puede apuntar a una dirección IP privada.',
			)
		}
		return
	}

	let addresses: Awaited<ReturnType<typeof lookup>>[]
	try {
		addresses = await lookup(hostname, { all: true })
	} catch {
		throw new UnsafeWebhookUrlError(
			'No se pudo resolver el host de la URL de destino.',
		)
	}

	if (addresses.length === 0) {
		throw new UnsafeWebhookUrlError(
			'No se pudo resolver el host de la URL de destino.',
		)
	}

	for (const address of addresses) {
		if (isPrivateIp(address.address)) {
			throw new UnsafeWebhookUrlError(
				'La URL de destino resuelve a una dirección IP interna.',
			)
		}
	}
}

/**
 * `fetch` endurecido contra SSRF para entregas de webhooks: valida que cada
 * destino (incluyendo cada redirección) resuelva a IPs públicas y sigue
 * redirecciones manualmente hasta MAX_REDIRECTS.
 *
 * Nota: la resolución se revalida inmediatamente antes de cada conexión para
 * reducir la ventana de DNS rebinding; para garantía total se requiere un
 * proxy de egreso con allowlist.
 */
export async function safeWebhookFetch(
	targetUrl: string,
	init: RequestInit,
): Promise<Response> {
	let currentUrl = targetUrl

	for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
		await assertPublicWebhookUrl(currentUrl)

		const response = await fetch(currentUrl, {
			...init,
			redirect: 'manual',
		})

		if (
			response.status >= 300 &&
			response.status < 400 &&
			response.headers.has('location')
		) {
			const location = response.headers.get('location') as string
			currentUrl = new URL(location, currentUrl).toString()
			continue
		}

		return response
	}

	throw new UnsafeWebhookUrlError(
		'La URL de destino excedió el máximo de redirecciones permitidas.',
	)
}
