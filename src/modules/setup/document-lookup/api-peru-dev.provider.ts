import {
	type DocumentLookupProvider,
	type RucData,
	RucNotFoundError,
} from './types'

interface ApiPeruDevRucResponseData {
	ruc: string
	nombre_o_razon_social: string
	estado: string
	condicion: string
	departamento: string
	provincia: string
	distrito: string
	direccion: string
	ubigeo_sunat: string
}

interface ApiPeruDevRucResponse {
	success: boolean
	data: ApiPeruDevRucResponseData
}

export class ApiPeruDevProvider implements DocumentLookupProvider {
	constructor(
		private readonly url: string,
		private readonly token: string,
	) {}

	async lookupRuc(ruc: string): Promise<RucData> {
		let response: Response
		try {
			response = await fetch(`${this.url}/api/ruc`, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.token}`,
				},
				body: JSON.stringify({ ruc }),
			})
		} catch (cause) {
			throw new Error('Error de conexión al consultar el RUC', { cause })
		}

		if (response.status === 404) {
			throw new RucNotFoundError()
		}

		if (!response.ok) {
			throw new Error(
				`Error al consultar el RUC (HTTP ${response.status})`,
			)
		}

		const json: ApiPeruDevRucResponse = await response.json()

		if (!json.success) {
			throw new RucNotFoundError()
		}

		const d = json.data
		return {
			ruc: d.ruc,
			legalName: d.nombre_o_razon_social,
			estado: d.estado,
			condicion: d.condicion,
			department: d.departamento,
			province: d.provincia,
			district: d.distrito,
			address: d.direccion,
			ubigeoCode: d.ubigeo_sunat,
		}
	}
}
