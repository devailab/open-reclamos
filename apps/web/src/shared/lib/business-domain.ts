export function validateBusinessDomain(value: string | null): string | null {
	const domain = value?.trim().toLowerCase() ?? ''

	if (!domain || /^[a-z0-9](?:[a-z0-9._-]{0,251}[a-z0-9])?$/.test(domain)) {
		return null
	}

	return 'Usa hasta 253 caracteres: letras, números, puntos, guiones o guiones bajos; empieza y termina con una letra o número.'
}
