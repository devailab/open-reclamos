export interface OptionItem {
	value: string
	label: string
}

export const DEFAULT_RESPONSE_DEADLINE_DAYS = 15
export const MIN_RESPONSE_DEADLINE_DAYS = 1
export const MAX_RESPONSE_DEADLINE_DAYS = 365

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

// Webhook Events - these are hardcoded instead of stored in the database
export const WEBHOOK_EVENTS = [
	{
		key: 'complaint.created',
		label: 'Queja creada',
		description: 'Se crea una nueva queja o reclamo',
	},
	{
		key: 'complaint.status_changed',
		label: 'Estado cambiado',
		description: 'El estado de la queja cambió',
	},
	{
		key: 'complaint.response_added',
		label: 'Respuesta registrada',
		description: 'Se registró una respuesta oficial',
	},
	{
		key: 'complaint.updated',
		label: 'Queja actualizada',
		description: 'Los datos de la queja fueron actualizados',
	},
] as const

export type WebhookEventKey = (typeof WEBHOOK_EVENTS)[number]['key']

export const MCP_TOOLS = {
	LIST_COMPLAINTS: 'list_complaints',
	GET_COMPLAINT: 'get_complaint',
	LIST_STORES: 'list_stores',
	LIST_COMPLAINT_REASONS: 'list_complaint_reasons',
	GET_ORGANIZATION_STATS: 'get_organization_stats',
} as const

export type McpToolName = (typeof MCP_TOOLS)[keyof typeof MCP_TOOLS]

export const MCP_TOOL_LABELS: Record<McpToolName, string> = {
	list_complaints: 'Listar reclamos',
	get_complaint: 'Ver reclamo por código',
	list_stores: 'Listar tiendas',
	list_complaint_reasons: 'Listar motivos de reclamo',
	get_organization_stats: 'Estadísticas generales',
}
