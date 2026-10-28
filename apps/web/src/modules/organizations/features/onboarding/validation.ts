import { required } from '@/shared/lib/validators'

export const validateRuc = (value: string | null): string | null =>
	/^\d{11}$/.test(value ?? '')
		? null
		: 'El RUC debe tener 11 dígitos numéricos.'

export const validateOrgName = (value: string | null): string | null =>
	!value?.trim() || value.trim().length > 300
		? 'Usa un nombre de entre 1 y 300 caracteres.'
		: null

export const validateLegalName = validateOrgName

export const validateSlug = (value: string | null): string | null =>
	!value || value.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
		? 'Usa hasta 100 letras minúsculas, números y guiones, sin guiones en los extremos.'
		: null

export const validateUbigeo = required
export const validateAddressType = required
export const validateAddress = validateOrgName

export const validateStoreName = (value: string | null): string | null =>
	!value?.trim() || value.trim().length < 3 || value.trim().length > 120
		? 'El nombre de la tienda debe tener entre 3 y 120 caracteres.'
		: null

export const validateStoreType = required
export const validateStoreUbigeo = required
export const validateStoreAddressType = required
export const validateStoreAddress = required

export const validateStoreColor = (value: string): string | null =>
	/^#[0-9a-f]{6}$/i.test(value)
		? null
		: 'Selecciona un color hexadecimal válido.'

export const validateWebsite = (value: string | null): string | null => {
	if (!value) {
		return null
	}

	try {
		const url = new URL(value)

		if (['https:', 'http:'].includes(url.protocol)) {
			return null
		}
	} catch {
		return 'Ingresa una URL válida con http:// o https://.'
	}

	return 'Ingresa una URL válida con http:// o https://.'
}
