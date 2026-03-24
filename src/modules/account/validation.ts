import { combine, minLength, required } from '@/lib/validators'

export const validateName = required

export const validateCurrentPassword = required

export const validateNewPassword = combine(
	required,
	minLength(8, 'La contraseña debe tener al menos 8 caracteres'),
)

export const validateConfirmPassword =
	(newPassword: string | null) =>
	(value: string | null): string | null => {
		if (!value) return 'Este campo es requerido'
		if (value !== newPassword) return 'Las contraseñas no coinciden'
		return null
	}
