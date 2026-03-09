export const validateReason = (value: string | null): string | null => {
	if (!value || value.trim() === '') return 'Este campo es requerido'
	if (value.trim().length < 3)
		return 'El motivo debe tener al menos 3 caracteres'
	if (value.trim().length > 200)
		return 'El motivo no puede superar los 200 caracteres'
	return null
}
