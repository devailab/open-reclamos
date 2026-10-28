import { OpListCountries, OpListUbigeos } from '@open-reclamos/rpc-client'
import { listRecords, type Request, record, text } from '@/shared/api/responses'
import { rpc } from '@/shared/api/rpc'
import type { AutocompleteOption } from '@/shared/components/forms/autocomplete-field'

export async function searchUbigeos(
	query: string,
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<AutocompleteOption[]> {
	signal?.throwIfAborted()

	if (!query.trim()) {
		return []
	}

	return listRecords(
		OpListUbigeos,
		(value) => {
			const data = record(value)

			return {
				value: text(data.id),
				label: `${text(data.district)}, ${text(data.province)}, ${text(data.department)}`,
			}
		},
		signal,
		request,
		{ filters: { search: query.trim() } },
	)
}

export function getCountries(signal?: AbortSignal, request: Request = rpc) {
	return listRecords(
		OpListCountries,
		(value) => {
			const data = record(value)

			return {
				id: text(data.id),
				name: text(data.name),
				iso2: text(data.iso2),
				phoneCode: text(data.phone_code),
			}
		},
		signal,
		request,
	)
}
