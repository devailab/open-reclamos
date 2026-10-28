// Solo memoria del documento actual: al recargar se recupera mediante el refresh HttpOnly.
export function createAccessTokenStore() {
	let token = ''
	let expiresAt = 0

	return {
		get() {
			return expiresAt > Date.now() / 1000 ? token : ''
		},
		set(value: string, expiry: number) {
			if (
				!value ||
				!Number.isSafeInteger(expiry) ||
				expiry <= Date.now() / 1000
			) {
				throw new Error(
					'El servidor devolvió un access token inválido.',
				)
			}

			token = value
			expiresAt = expiry
		},
		clear() {
			token = ''
			expiresAt = 0
		},
	}
}
