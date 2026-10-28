export function safeReturnTo(value: string | null | undefined): string | null {
	if (!value?.startsWith('/') || value.startsWith('//')) {
		return null
	}

	try {
		const decoded = decodeURIComponent(value)

		if (
			decoded.startsWith('//') ||
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Los controles se rechazan para evitar normalizaciones inseguras del redirect.
			/[\\\u0000-\u0020\u007f]/.test(decoded)
		) {
			return null
		}

		const url = new URL(value, 'https://local.invalid')

		if (url.origin !== 'https://local.invalid') {
			return null
		}

		if (
			url.pathname !== '/setup' &&
			url.pathname !== '/dashboard' &&
			!url.pathname.startsWith('/dashboard/')
		) {
			return null
		}

		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return null
	}
}

export function loginPath(returnTo: string): string {
	const safe = safeReturnTo(returnTo)

	return safe ? `/login?returnTo=${encodeURIComponent(safe)}` : '/login'
}
