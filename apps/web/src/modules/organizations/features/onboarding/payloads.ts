import type { SetupOrganizationInput, SetupStoreInput } from './api'

export function organizationPayload(data: SetupOrganizationInput) {
	return {
		tax_id: data.ruc,
		name: data.name.trim(),
		legal_name: data.legalName.trim(),
		slug: data.slug.trim(),
		ubigeo_id: data.ubigeoId,
		address_type: data.addressType,
		address: data.address.trim(),
		phone_code: data.phoneCode ?? '',
		phone: data.phone ?? '',
		website: data.website ?? '',
	}
}

export function storePayload(data: SetupStoreInput) {
	const physical = data.type === 'physical'

	return {
		name: data.name.trim(),
		slug: data.slug.trim(),
		type: data.type,
		color: data.color,
		ubigeo_id: physical ? (data.ubigeoId ?? '') : '',
		address_type: physical ? (data.addressType ?? '') : '',
		address: physical ? (data.address ?? '') : '',
		url: physical ? '' : (data.url ?? ''),
	}
}
