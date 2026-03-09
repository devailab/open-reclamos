import { combine, email, required } from '@/lib/validators'

// Step 1 validators
export const validateDocumentNumber = combine(required, (v) => {
	const s = String(v ?? '').trim()
	if (s.length < 6 || s.length > 20)
		return 'El número de documento debe tener entre 6 y 20 caracteres'
	return null
})

export const validateEmail = combine(required, email)

// Step 2 validators
export const validateComplaintType = required

export const validateItemDescription = required

export const validateConfirmation = (value: boolean): string | null => {
	if (!value)
		return 'Debes confirmar que la información ingresada es correcta'
	return null
}
