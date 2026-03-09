import { required } from '@/lib/validators'

export const validateRuc = (value: string | null): string | null => {
	if (!value) return 'El RUC es requerido'
	if (!/^\d{11}$/.test(value)) return 'El RUC debe tener 11 dígitos numéricos'
	return null
}

export const validateOrgName = required

export const validateLegalName = required

export const validateSlug = (value: string | null): string | null => {
	if (!value) return 'El identificador es requerido'
	if (!/^[a-z0-9-]+$/.test(value)) {
		return 'Solo letras minúsculas, números y guiones'
	}
	if (value.startsWith('-') || value.endsWith('-')) {
		return 'No puede empezar ni terminar con guión'
	}
	return null
}

export const validateAddressType = required

export const validateAddress = required

export const validateStoreName = required

export const validateStoreType = required

export const validateStoreUbigeo = required

export const validateStoreAddressType = required

export const validateStoreAddress = required
