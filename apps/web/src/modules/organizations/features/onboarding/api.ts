import {
	OpCompleteSetup,
	OpCreateOrganization,
	OpSuggestOrganizationSlug,
} from '@open-reclamos/rpc-client'
import { lookupRuc } from '@/modules/integrations/api/document-lookup'
import { rpc } from '@/shared/api/rpc'
import { type Request, record, text } from '../../../../shared/api/responses'
import { organizationPayload, storePayload } from './payloads'

export async function lookupOrganizationByRuc(
	ruc: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	const data = await lookupRuc(ruc, signal, request)
	const slug = await suggestSlug(data.legalName, signal, request)

	signal?.throwIfAborted()

	return { ...data, slug }
}

export interface SetupOrganizationInput {
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

export interface SetupStoreInput {
	name: string
	slug: string
	type: string
	color: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
}

export interface CountryDTO {
	id: string
	name: string
	iso2: string
	phone_code: string
}

export async function suggestSlug(
	name: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const result = record(
		await request(OpSuggestOrganizationSlug, { data: { name } }, signal),
	)

	signal?.throwIfAborted()

	return text(result.slug)
}

export async function completeSetup(
	organization: SetupOrganizationInput,
	store: SetupStoreInput,
	mode: 'setup' | 'dashboard',
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const data = organizationPayload(organization)

	const result = record(
		await (mode === 'setup'
			? request(
					OpCompleteSetup,
					{
						data: {
							organization: data,
							store: storePayload(store),
						},
					},
					signal,
				)
			: request(
					OpCreateOrganization,
					{ data: { ...data, initial_store: storePayload(store) } },
					signal,
				)),
	)

	signal?.throwIfAborted()

	return { id: text(result.id), name: text(result.name) }
}

export { getCountries, searchUbigeos } from '@/modules/catalogs/api/locations'
export { lookupRuc } from '@/modules/integrations/api/document-lookup'
