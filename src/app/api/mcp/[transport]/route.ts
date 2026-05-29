import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createMcpHandler } from 'mcp-handler'
import type { NextRequest } from 'next/server'
import { resolveApiKeyFromString, unauthorizedResponse } from '@/lib/api-auth'
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
	const url = request.nextUrl
	const key = url.searchParams.get('key')

	if (!key) {
		return unauthorizedResponse('Se requiere el parámetro ?key=API_KEY')
	}

	const auth = await resolveApiKeyFromString(key)
	if (!auth) return unauthorizedResponse()

	const mcpSettings = await getOrganizationMcpSettings(auth.organizationId)

	const ctx: McpRequestContext = {
		userId: auth.userId,
		organizationId: auth.organizationId,
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
