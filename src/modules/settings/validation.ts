import { required } from '@/lib/validators'

export const validateOrgName = required
export const validateLegalName = required
export const validateUbigeo = required
export const validateAddressType = required
export const validateAddress = required

export interface UpdateOrganizationInput {
	name: string | null
	legalName: string | null
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	phoneCode: string | null
	phone: string | null
	website: string | null
}

export function normalizeUpdateOrganizationInput(
	input: UpdateOrganizationInput,
) {
	return {
		name: input.name?.trim() ?? null,
		legalName: input.legalName?.trim() ?? null,
		ubigeoId: input.ubigeoId?.trim() ?? null,
		addressType: input.addressType?.trim() ?? null,
		address: input.address?.trim() ?? null,
		phoneCode: input.phoneCode?.trim() || null,
		phone: input.phone?.trim() || null,
		website: input.website?.trim() || null,
	}
}

export function validateUpdateOrganizationInput(
	input: ReturnType<typeof normalizeUpdateOrganizationInput>,
): string | null {
	if (!input.name) return 'El nombre comercial es requerido'
	if (!input.legalName) return 'La razón social es requerida'
	if (!input.ubigeoId) return 'El distrito es requerido'
	if (!input.addressType) return 'El tipo de vía es requerido'
	if (!input.address) return 'La dirección es requerida'
	return null
}
