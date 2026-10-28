import { combine, email, required } from '@/shared/lib/validators'

export const validateEmail = combine(required, email)

export const validateName = (value: string | null): string | null => {
	if (!value?.trim()) {
		return 'El nombre es requerido.'
	}
	return value.trim().length > 120 ? 'Usa como máximo 120 caracteres.' : null
}

export const validateLastName = (value: string | null): string | null => {
	if (!value?.trim()) {
		return 'Los apellidos son requeridos.'
	}

	return value.trim().length > 120 ? 'Usa como máximo 120 caracteres.' : null
}

export const validateLoginPassword = (value: string | null): string | null => {
	if (!value) {
		return 'La contraseña es requerida.'
	}

	return new TextEncoder().encode(value).length > 256
		? 'La contraseña es demasiado larga.'
		: null
}

export const validatePassword = (value: string | null): string | null => {
	const length = new TextEncoder().encode(value ?? '').length

	return length < 12 || length > 256
		? 'La contraseña debe tener entre 12 y 256 caracteres.'
		: null
}

export const validateConfirmPassword =
	(password: string | null) =>
	(value: string | null): string | null => {
		if (!value) {
			return 'Este campo es requerido.'
		}
		return value === password ? null : 'Las contraseñas no coinciden.'
	}
// Sin formato ni consulta externa: solo requerido y hasta 20 caracteres.
export const validateUserDocumentNumber = (
	value: string | null,
): string | null => {
	if (!value?.trim()) {
		return 'El número de documento es requerido.'
	}
	return value.trim().length > 20 ? 'Usa como máximo 20 caracteres.' : null
}

export const validateVerificationCode = (
	value: string | null,
): string | null =>
	/^\d{6}$/.test(value ?? '') ? null : 'Ingresa el código de 6 dígitos.'

export function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'No se pudo completar la operación. Intenta nuevamente.'
}
