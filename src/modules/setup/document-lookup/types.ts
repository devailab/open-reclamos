export interface RucData {
	ruc: string
	legalName: string
	estado: string
	condicion: string
	department: string
	province: string
	district: string
	address: string
	ubigeoCode: string
}

export interface DocumentLookupProvider {
	lookupRuc(ruc: string): Promise<RucData>
}

export class RucNotFoundError extends Error {
	constructor() {
		super('RUC no encontrado en SUNAT')
		this.name = 'RucNotFoundError'
	}
}
