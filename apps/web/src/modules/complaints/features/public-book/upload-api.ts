export interface UploadToken {
	id: string
	token: string
}

export async function uploadComplaintFile(
	file: File,
	storeSlug: string,
	turnstileToken: string | null,
): Promise<UploadToken> {
	const body = new FormData()

	body.append('file', file)
	body.append('store_slug', storeSlug)

	if (turnstileToken) {
		body.append('turnstile_token', turnstileToken)
	}

	const response = await fetch('/api/complaints/upload', {
		method: 'POST',
		body,
	})

	const text = await response.text()
	let data: unknown

	try {
		data = JSON.parse(text)
	} catch {
		data = null
	}

	if (!response.ok) {
		const message =
			data &&
			typeof data === 'object' &&
			'error' in data &&
			typeof data.error === 'string'
				? data.error
				: text

		throw new Error(message || 'No se pudo subir el archivo.')
	}

	if (
		!data ||
		typeof data !== 'object' ||
		!('id' in data) ||
		!('token' in data) ||
		typeof data.id !== 'string' ||
		!data.id ||
		typeof data.token !== 'string' ||
		!data.token
	) {
		throw new Error(
			'El servidor no devolvió un identificador y token válidos para el archivo.',
		)
	}

	return { id: data.id, token: data.token }
}

export async function deleteComplaintUpload(upload: UploadToken) {
	const response = await fetch('/api/complaints/upload', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: upload.id, token: upload.token }),
	})

	if (!response.ok) {
		throw new Error('No se pudo eliminar el archivo temporal.')
	}
}
