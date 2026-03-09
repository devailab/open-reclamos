import { combine, email, minLength, required } from '@/lib/validators'

export const validateEmail = combine(required, email)

export const validatePassword = combine(
	required,
	minLength(8, 'La contraseña debe tener al menos 8 caracteres'),
)

export const validateName = required

export const validateConfirmPassword =
	(password: string | null) =>
	(value: string | null): string | null => {
		if (!value) return 'Este campo es requerido'
		if (value !== password) return 'Las contraseñas no coinciden'
		return null
	}
