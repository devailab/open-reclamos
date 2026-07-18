import { ADDRESS_TYPE_OPTIONS, STORE_TYPE_OPTIONS } from '@/lib/constants'
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

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ADDRESS_TYPES = new Set(ADDRESS_TYPE_OPTIONS.map((o) => o.value))
const STORE_TYPES = new Set(STORE_TYPE_OPTIONS.map((o) => o.value))

const MAX_NAME_LENGTH = 200
const MAX_ADDRESS_LENGTH = 300
const MAX_SLUG_LENGTH = 100

interface SetupOrganizationPayload {
	ruc: string
	name: string
	legalName: string
	slug: string
	ubigeoId: string
	addressType: string
	address: string
	phoneCode: string | null
	phone: string | null
	website: string | null
}

interface SetupStorePayload {
	name: string
	type: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
}

/**
 * Validación integral del payload de organización en servidor.
 * Retorna un mensaje de error o null si es válido.
 */
export function validateSetupOrganizationPayload(
	input: SetupOrganizationPayload,
): string | null {
	const rucError = validateRuc(input.ruc)
	if (rucError) return rucError

	if (!input.name?.trim() || input.name.length > MAX_NAME_LENGTH) {
		return 'El nombre de la organización no es válido.'
	}
	if (!input.legalName?.trim() || input.legalName.length > MAX_NAME_LENGTH) {
		return 'La razón social no es válida.'
	}

	const slugError = validateSlug(input.slug)
	if (slugError) return slugError
	if (input.slug.length > MAX_SLUG_LENGTH) {
		return 'El identificador es demasiado largo.'
	}

	if (!UUID_REGEX.test(input.ubigeoId ?? '')) {
		return 'El distrito seleccionado no es válido.'
	}
	if (!ADDRESS_TYPES.has(input.addressType)) {
		return 'El tipo de vía no es válido.'
	}
	if (!input.address?.trim() || input.address.length > MAX_ADDRESS_LENGTH) {
		return 'La dirección no es válida.'
	}

	if (input.phoneCode !== null && !/^\+?\d{1,4}$/.test(input.phoneCode)) {
		return 'El código de país no es válido.'
	}
	if (input.phone !== null && input.phone.length > 20) {
		return 'El teléfono no es válido.'
	}
	if (input.website !== null) {
		if (input.website.length > 300) return 'El sitio web no es válido.'
		try {
			const parsed = new URL(input.website)
			if (!['http:', 'https:'].includes(parsed.protocol)) {
				return 'El sitio web debe iniciar con http:// o https://.'
			}
		} catch {
			return 'El sitio web no es válido.'
		}
	}

	return null
}

/**
 * Validación integral del payload de tienda en servidor.
 * Retorna un mensaje de error o null si es válido.
 */
export function validateSetupStorePayload(
	input: SetupStorePayload,
): string | null {
	if (!input.name?.trim() || input.name.length > MAX_NAME_LENGTH) {
		return 'El nombre de la tienda no es válido.'
	}
	if (!STORE_TYPES.has(input.type)) {
		return 'El tipo de tienda no es válido.'
	}
	if (input.ubigeoId !== null && !UUID_REGEX.test(input.ubigeoId)) {
		return 'El distrito seleccionado no es válido.'
	}
	if (input.addressType !== null && !ADDRESS_TYPES.has(input.addressType)) {
		return 'El tipo de vía no es válido.'
	}
	if (input.address !== null && input.address.length > MAX_ADDRESS_LENGTH) {
		return 'La dirección no es válida.'
	}
	if (input.url !== null) {
		if (input.url.length > 300) return 'La URL de la tienda no es válida.'
		try {
			const parsed = new URL(input.url)
			if (!['http:', 'https:'].includes(parsed.protocol)) {
				return 'La URL de la tienda debe iniciar con http:// o https://.'
			}
		} catch {
			return 'La URL de la tienda no es válida.'
		}
	}

	return null
}
