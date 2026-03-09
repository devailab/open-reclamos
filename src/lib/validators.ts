export const required = (value: unknown): string | null => {
	if (value === null || value === undefined || value === '') {
		return 'Este campo es requerido'
	}
	return null
}

export const email = (value: unknown): string | null => {
	if (!value) return null
	const stringValue = String(value)
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	if (!emailRegex.test(stringValue)) {
		return 'Ingresa un email válido'
	}
	return null
}

export const minLength =
	(min: number, message?: string) =>
	(value: unknown): string | null => {
		const str = String(value ?? '')
		if (str.length < min) {
			return message ?? `Debe tener al menos ${min} caracteres`
		}
		return null
	}

export const combine =
	(...validators: Array<(value: unknown) => string | null>) =>
	(value: unknown): string | null => {
		for (const validator of validators) {
			const error = validator(value)
			if (error) return error
		}
		return null
	}
