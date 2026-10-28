export function resolveNoticeUrl(
	value: string | null | undefined,
	fallback: string,
) {
	return value?.trim() || fallback.trim()
}

export function validateNoticeUrl(value: string): string | null {
	const target = value.trim()

	try {
		const url = new URL(target)

		if (
			target.length <= 2048 &&
			!/[\r\n\t]/.test(target) &&
			(url.protocol === 'http:' || url.protocol === 'https:') &&
			!url.username &&
			!url.password
		) {
			return null
		}
	} catch {}

	return 'El enlace del QR debe ser una URL HTTP o HTTPS válida, sin credenciales y de hasta 2048 caracteres.'
}
