// Validación pura de URLs de webhook (sin APIs de Node) para poder usarse
// tanto en el cliente como en el servidor. La verificación DNS completa vive
// en `ssrf.ts` (solo servidor).

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

export function ipVersion(host: string): 4 | 6 | 0 {
	if (IPV4_REGEX.test(host)) {
		const parts = host.split('.').map(Number)
		return parts.every((p) => p <= 255) ? 4 : 0
	}
	// Heurística suficiente: los hostnames válidos no contienen ':'
	if (host.includes(':')) return 6
	return 0
}

function isPrivateIpv4(ip: string): boolean {
	const parts = ip.split('.').map(Number)
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p > 255)) {
		return true
	}
	const [a, b] = parts

	// Loopback, "this network", link-local, privados, CGN, benchmarking,
	// multicast, reservado y broadcast.
	if (a === 0 || a === 10 || a === 127) return true
	if (a === 100 && b >= 64 && b <= 127) return true
	if (a === 169 && b === 254) return true
	if (a === 172 && b >= 16 && b <= 31) return true
	if (a === 192 && b === 0) return true
	if (a === 192 && b === 168) return true
	if (a === 198 && (b === 18 || b === 19)) return true
	if (a >= 224) return true

	return false
}

function isPrivateIpv6(ip: string): boolean {
	const normalized = ip.toLowerCase().split('%')[0]

	// IPv4 embebido en IPv6 (::ffff:1.2.3.4)
	const v4Match = normalized.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
	if (v4Match) return isPrivateIpv4(v4Match[1])

	if (normalized === '::' || normalized === '::1') return true
	// ULA (fc00::/7), link-local (fe80::/10)
	if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
	if (
		normalized.startsWith('fe8') ||
		normalized.startsWith('fe9') ||
		normalized.startsWith('fea') ||
		normalized.startsWith('feb')
	) {
		return true
	}

	return false
}

export function isPrivateIp(ip: string): boolean {
	const version = ipVersion(ip)
	if (version === 4) return isPrivateIpv4(ip)
	if (version === 6) return isPrivateIpv6(ip)
	return true
}

/**
 * Chequeo sincrónico (sin DNS): rechaza protocolos no soportados, hosts
 * locales evidentes e IPs literales privadas.
 * Retorna un mensaje de error o null si pasa.
 */
export function validateWebhookUrlSyntax(rawUrl: string): string | null {
	let parsed: URL
	try {
		parsed = new URL(rawUrl)
	} catch {
		return 'La URL de destino no es válida.'
	}

	if (!['http:', 'https:'].includes(parsed.protocol)) {
		return 'La URL debe iniciar con http:// o https://.'
	}

	if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
		return 'La URL de destino debe usar HTTPS.'
	}

	const hostname = parsed.hostname.replace(/^\[|\]$/g, '')

	if (
		hostname === 'localhost' ||
		hostname.endsWith('.localhost') ||
		hostname.endsWith('.local') ||
		hostname.endsWith('.internal')
	) {
		return 'La URL de destino no puede apuntar a un host interno.'
	}

	if (ipVersion(hostname) !== 0 && isPrivateIp(hostname)) {
		return 'La URL de destino no puede apuntar a una dirección IP privada.'
	}

	return null
}
