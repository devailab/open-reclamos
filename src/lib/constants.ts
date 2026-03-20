export interface OptionItem {
	value: string
	label: string
}

export const DOCUMENT_TYPE_OPTIONS: OptionItem[] = [
	{ value: 'DNI', label: 'DNI' },
	{ value: 'CE', label: 'Carné de extranjería' },
	{ value: 'PASAPORTE', label: 'Pasaporte' },
]

export const COMPLAINT_TYPE_OPTIONS = [
	{
		value: 'claim',
		label: 'Reclamo',
		description: 'Disconformidad con el producto o servicio adquirido',
	},
	{
		value: 'complaint',
		label: 'Queja',
		description:
			'Disconformidad con la atención, servicio al cliente o personal',
	},
]

export const ITEM_TYPE_OPTIONS = [
	{ value: 'product', label: 'Producto' },
	{ value: 'service', label: 'Servicio' },
]

export const CURRENCY_OPTIONS: OptionItem[] = [
	{ value: 'PEN', label: 'Soles (S/)' },
	{ value: 'USD', label: 'Dólares (US$)' },
]

export const PROOF_TYPE_OPTIONS: OptionItem[] = [
	{ value: 'FACTURA', label: 'Factura' },
	{ value: 'BOLETA', label: 'Boleta de venta' },
	{ value: 'TICKET', label: 'Ticket' },
	{ value: 'RECIBO', label: 'Recibo' },
]

export const ADDRESS_TYPE_OPTIONS: OptionItem[] = [
	{ value: 'CALLE', label: 'Calle' },
	{ value: 'AVENIDA', label: 'Avenida' },
	{ value: 'JIRON', label: 'Jiron' },
	{ value: 'PASAJE', label: 'Pasaje' },
	{ value: 'CARRETERA', label: 'Carretera' },
	{ value: 'ESQUINA', label: 'Esquina' },
	{ value: 'PROLONGACION', label: 'Prolongacion' },
	{ value: 'URBANIZACION', label: 'Urbanizacion' },
]

export const STORE_TYPE_OPTIONS: OptionItem[] = [
	{ value: 'physical', label: 'Física' },
	{ value: 'virtual', label: 'Virtual' },
]

export const STORE_TYPE_FILTER_OPTIONS: OptionItem[] = [
	{ value: 'all', label: 'Todos los tipos' },
	{ value: 'physical', label: 'Física' },
	{ value: 'virtual', label: 'Virtual' },
]

export const REASON_LEVEL_FILTER_OPTIONS: OptionItem[] = [
	{ value: 'all', label: 'Todos los niveles' },
	{ value: 'root', label: 'Principal' },
	{ value: 'child', label: 'Submotivo' },
]

export const REASON_PARENT_FILTER_ALL: OptionItem = {
	value: 'all',
	label: 'Todos los motivos padre',
}
