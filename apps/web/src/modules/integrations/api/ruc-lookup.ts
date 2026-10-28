import { ADDRESS_TYPE_OPTIONS } from '@/shared/constants/options'
import { record, text } from '../../../shared/api/responses'

export function parseRucLookup(response: unknown, ruc: string) {
	const result = record(response)

	if (result.available === false) {
		throw new Error(
			'La consulta no está disponible. Intenta nuevamente en unos momentos.',
		)
	}

	if (result.success !== true) {
		throw new Error(
			'No se encontró el RUC. Revisa el número e intenta nuevamente.',
		)
	}

	const data = record(result.data)

	if (text(data.ruc) !== ruc) {
		throw new Error('La consulta devolvió un RUC diferente.')
	}

	return {
		legalName: text(data.nombre_o_razon_social),
		address:
			typeof data.direccion === 'string' ? data.direccion.trim() : '',
		ubigeoCode:
			typeof data.ubigeo_sunat === 'string' ? data.ubigeo_sunat : '',
		district: typeof data.distrito === 'string' ? data.distrito : '',
		province: typeof data.provincia === 'string' ? data.provincia : '',
		department:
			typeof data.departamento === 'string' ? data.departamento : '',
	}
}

export function guessAddressType(address: string) {
	const normalized = address.trim().toUpperCase()

	const candidates: Array<[string[], string]> = [
		[['AV.', 'AVE.', 'AVENIDA'], 'AVENIDA'],
		[['JR.', 'JR ', 'JIRON', 'JIRÓN'], 'JIRON'],
		[['PJE.', 'PJ.', 'PSJE.', 'PASAJE'], 'PASAJE'],
		[['CARR.', 'CAR.', 'CARRETERA'], 'CARRETERA'],
		[['ESQ.', 'ESQUINA'], 'ESQUINA'],
		[['CAL.', 'CALLE', 'CLL.', 'CL.'], 'CALLE'],
		[['URB.', 'URBANIZACION', 'URBANIZACIÓN'], 'URBANIZACION'],
		[['PROL.', 'PROLONGACION', 'PROLONGACIÓN'], 'PROLONGACION'],
	]

	const match = candidates.find(([prefixes]) =>
		prefixes.some((prefix) => normalized.startsWith(prefix)),
	)

	return (
		ADDRESS_TYPE_OPTIONS.find((option) => option.value === match?.[1]) ??
		null
	)
}
