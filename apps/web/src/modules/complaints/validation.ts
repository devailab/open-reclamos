import { combine, email, required } from '@/shared/lib/validators'

// Step 1 validators
export const validateDocumentNumber = combine(required, (v) => {
	const s = String(v ?? '').trim()

	if (s.length < 6 || s.length > 20) {
		return 'El número de documento debe tener entre 6 y 20 caracteres'
	}

	return null
})

export const validateEmail = combine(required, email)

export const validateRuc = combine(required, (v) => {
	const s = String(v ?? '').trim()

	if (!/^\d{11}$/.test(s)) {
		return 'El RUC debe tener 11 dígitos'
	}
	return null
})

// Step 2 validators
export const validateComplaintType = required

export const maxText =
	(max: number) =>
	(value: unknown): string | null => {
		return Array.from(String(value ?? '').trim()).length > max
			? `El máximo permitido es ${max} caracteres`
			: null
	}

const requiredText = (value: unknown) => required(String(value ?? '').trim())
export const validateConsumerName = combine(requiredText, maxText(120))
export const validateLegalName = combine(requiredText, maxText(200))
export const validateItemDescription = combine(requiredText, maxText(1000))
export const validateOfficialResponse = combine(requiredText, maxText(10000))

export const validateAmount = (value: number | null): string | null => {
	if (value === null) {
		return null
	}

	return Number.isFinite(value) && /^\d{1,8}(\.\d{1,2})?$/.test(String(value))
		? null
		: 'Ingresa un monto entre 0 y 99999999.99 con hasta 2 decimales'
}

export const validateConfirmation = (value: boolean): string | null => {
	if (!value) {
		return 'Debes confirmar que la información ingresada es correcta'
	}

	return null
}
