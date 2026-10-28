import { OpListUbigeos, OpLookupDocument } from '@open-reclamos/rpc-client'
import { listRecords, type Request, record, text } from '@/shared/api/responses'
import { rpc } from '@/shared/api/rpc'
import type { AutocompleteOption } from '@/shared/components/forms/autocomplete-field'
import { parseRucLookup } from './ruc-lookup'

export async function lookupRuc(
	ruc: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const result = parseRucLookup(
		await request(
			OpLookupDocument,
			{ data: { type: 'ruc', number: ruc } },
			signal,
		),
		ruc,
	)

	signal?.throwIfAborted()

	let ubigeo: AutocompleteOption | null = null

	if (result.ubigeoCode || result.district.trim()) {
		const options = await listRecords(
			OpListUbigeos,
			(value) => {
				const data = record(value)

				return {
					id: text(data.id),
					code: data.ubigeo,
					reniecCode: data.ubigeo_reniec,
					district: text(data.district),
					province: text(data.province),
					department: text(data.department),
				}
			},
			signal,
			request,
			{
				filters: result.ubigeoCode
					? { ubigeo_code: result.ubigeoCode }
					: { search: result.district },
			},
		)

		const normalize = (value: string) => value.trim().toUpperCase()

		const match =
			options.find(
				(option) =>
					result.ubigeoCode &&
					(option.code === result.ubigeoCode ||
						option.reniecCode === result.ubigeoCode),
			) ??
			options.find(
				(option) =>
					normalize(option.district) === normalize(result.district) &&
					normalize(option.province) === normalize(result.province) &&
					normalize(option.department) ===
						normalize(result.department),
			)

		if (match) {
			ubigeo = {
				value: match.id,
				label: `${match.district}, ${match.province}, ${match.department}`,
			}
		}
	}

	signal?.throwIfAborted()

	return { ...result, ubigeo }
}
