import { AsyncLocalStorage } from 'node:async_hooks'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { MCP_TOOLS } from '@/lib/constants'
import { maskComplaint } from './masking'
import {
	getComplaintByTrackingCodeForMcp,
	getComplaintReasonsForMcp,
	getComplaintsForMcp,
	getOrganizationStatsForMcp,
	getStoresForMcp,
} from './queries'

export interface McpRequestContext {
	userId: string
	organizationId: string
	enabledTools: string[] | null
	showSensitiveData: boolean
}

export const mcpStorage = new AsyncLocalStorage<McpRequestContext>()

const TOOL_DEFINITIONS = [
	{
		name: MCP_TOOLS.LIST_COMPLAINTS,
		description:
			'Lista paginada de reclamos y quejas de la organización con filtros opcionales.',
		inputSchema: {
			type: 'object' as const,
			properties: {
				page: {
					type: 'integer',
					minimum: 1,
					default: 1,
					description: 'Número de página (desde 1)',
				},
				pageSize: {
					type: 'integer',
					minimum: 1,
					maximum: 50,
					default: 20,
					description: 'Resultados por página (máximo 50)',
				},
				status: {
					type: 'string',
					enum: ['open', 'in_review', 'resolved'],
					description: 'Filtrar por estado',
				},
				type: {
					type: 'string',
					enum: ['complaint', 'claim'],
					description:
						'Filtrar por tipo: complaint=queja, claim=reclamo',
				},
				storeId: {
					type: 'string',
					description: 'UUID de la tienda para filtrar',
				},
				search: {
					type: 'string',
					description:
						'Texto de búsqueda en correlativo, código de seguimiento, nombre o apellido',
				},
			},
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: MCP_TOOLS.GET_COMPLAINT,
		description:
			'Obtiene el detalle completo de un reclamo o queja por su código de seguimiento.',
		inputSchema: {
			type: 'object' as const,
			properties: {
				trackingCode: {
					type: 'string',
					description:
						'Código de seguimiento del reclamo (ej: ABC-2024-00001)',
				},
			},
			required: ['trackingCode'],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: MCP_TOOLS.LIST_STORES,
		description: 'Lista todas las tiendas de la organización.',
		inputSchema: {
			type: 'object' as const,
			properties: {},
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: MCP_TOOLS.LIST_COMPLAINT_REASONS,
		description:
			'Lista los motivos de reclamo disponibles para la organización (globales y propios).',
		inputSchema: {
			type: 'object' as const,
			properties: {},
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: MCP_TOOLS.GET_ORGANIZATION_STATS,
		description:
			'Obtiene estadísticas generales de la organización: total de reclamos por estado y vencidos.',
		inputSchema: {
			type: 'object' as const,
			properties: {},
		},
		annotations: { readOnlyHint: true },
	},
] as const

function toolError(message: string) {
	return {
		content: [{ type: 'text' as const, text: message }],
		isError: true,
	}
}

function toolResult(data: unknown) {
	return {
		content: [
			{ type: 'text' as const, text: JSON.stringify(data, null, 2) },
		],
	}
}

function getContext() {
	const ctx = mcpStorage.getStore()
	if (!ctx) return null
	return ctx
}

function isToolEnabled(ctx: McpRequestContext, toolName: string): boolean {
	if (ctx.enabledTools === null) return true
	return ctx.enabledTools.includes(toolName)
}

export function registerMcpTools(server: McpServer) {
	const rawServer = server.server

	// El SDK exige declarar la capacidad antes de registrar handlers crudos
	// para `tools/list` y `tools/call`.
	rawServer.registerCapabilities({
		tools: {
			listChanged: true,
		},
	})

	rawServer.setRequestHandler(ListToolsRequestSchema, () => {
		const ctx = getContext()
		const tools = TOOL_DEFINITIONS.filter(
			(t) => ctx === null || isToolEnabled(ctx, t.name),
		)
		return { tools }
	})

	rawServer.setRequestHandler(CallToolRequestSchema, async (request) => {
		const ctx = getContext()
		if (!ctx) return toolError('No autenticado.')

		const toolName = request.params.name
		const args = (request.params.arguments ?? {}) as Record<string, unknown>

		if (!isToolEnabled(ctx, toolName)) {
			return toolError(
				`La herramienta "${toolName}" no está habilitada para esta organización.`,
			)
		}

		try {
			switch (toolName) {
				case MCP_TOOLS.LIST_COMPLAINTS: {
					const result = await getComplaintsForMcp(
						ctx.organizationId,
						{
							page:
								typeof args.page === 'number'
									? args.page
									: undefined,
							pageSize:
								typeof args.pageSize === 'number'
									? args.pageSize
									: undefined,
							status:
								typeof args.status === 'string'
									? args.status
									: undefined,
							type:
								typeof args.type === 'string'
									? args.type
									: undefined,
							storeId:
								typeof args.storeId === 'string'
									? args.storeId
									: undefined,
							search:
								typeof args.search === 'string'
									? args.search
									: undefined,
						},
					)
					return toolResult({
						...result,
						rows: result.rows.map((row) =>
							maskComplaint(row, ctx.showSensitiveData),
						),
					})
				}

				case MCP_TOOLS.GET_COMPLAINT: {
					if (typeof args.trackingCode !== 'string') {
						return toolError(
							'Se requiere el parámetro trackingCode.',
						)
					}
					const complaint = await getComplaintByTrackingCodeForMcp(
						ctx.organizationId,
						args.trackingCode,
					)
					if (!complaint) {
						return toolError(
							`No se encontró un reclamo con código de seguimiento "${args.trackingCode}".`,
						)
					}
					return toolResult(
						maskComplaint(complaint, ctx.showSensitiveData),
					)
				}

				case MCP_TOOLS.LIST_STORES: {
					const stores = await getStoresForMcp(ctx.organizationId)
					return toolResult(stores)
				}

				case MCP_TOOLS.LIST_COMPLAINT_REASONS: {
					const reasons = await getComplaintReasonsForMcp(
						ctx.organizationId,
					)
					return toolResult(reasons)
				}

				case MCP_TOOLS.GET_ORGANIZATION_STATS: {
					const stats = await getOrganizationStatsForMcp(
						ctx.organizationId,
					)
					return toolResult(stats)
				}

				default:
					return toolError(`Herramienta desconocida: "${toolName}".`)
			}
		} catch {
			return toolError(
				'Ocurrió un error al ejecutar la herramienta. Inténtalo nuevamente.',
			)
		}
	})
}
