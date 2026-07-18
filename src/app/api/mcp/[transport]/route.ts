import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createMcpHandler } from 'mcp-handler'
import type { NextRequest } from 'next/server'
import {
	getAllowedStoreIds,
	resolveApiKey,
	unauthorizedResponse,
} from '@/lib/api-auth'
import type { McpRequestContext } from '@/modules/mcp/tools'
import { mcpStorage, registerMcpTools } from '@/modules/mcp/tools'
import { getOrganizationMcpSettings } from '@/modules/settings/queries'

const mcpHandler = createMcpHandler(
	(server: McpServer) => {
		registerMcpTools(server)
	},
	{ serverInfo: { name: 'open-reclamos', version: '1.0.0' } },
	{ basePath: '/api/mcp' },
)

async function handler(request: NextRequest) {
	// La clave viaja únicamente en el header Authorization para evitar
	// que termine en logs, historiales o URLs compartidas.
	const auth = await resolveApiKey(request)
	if (!auth) {
		return unauthorizedResponse(
			'Se requiere el header "Authorization: Bearer <API_KEY>".',
		)
	}

	const mcpSettings = await getOrganizationMcpSettings(auth.organizationId)

	const ctx: McpRequestContext = {
		userId: auth.userId,
		organizationId: auth.organizationId,
		permissionKeys: auth.membership.permissionKeys,
		allowedStoreIds: getAllowedStoreIds(auth.membership),
		enabledTools: mcpSettings.mcpEnabledTools
			? mcpSettings.mcpEnabledTools
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: null,
		showSensitiveData: mcpSettings.mcpShowSensitiveData,
	}

	return mcpStorage.run(ctx, () => mcpHandler(request))
}

export { handler as GET, handler as POST }
