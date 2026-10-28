import {
	OpGetOrganization,
	OpGetSettings,
	OpGetSSOSettings,
	OpListSSOConnections,
	OpListUbigeos,
	OpRemoveLogo,
	OpUpdateOrganization,
	OpUpdateSettings,
} from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'
import type {
	OrganizationDTO,
	OrganizationSettings,
	SettingsDTO,
	SSOConnection,
	SSOPolicy,
} from './types'

export async function loadSettings(
	signal?: AbortSignal,
): Promise<OrganizationSettings> {
	const [org, settings] = await Promise.all([
		rpc<OrganizationDTO>(OpGetOrganization, undefined, signal),
		rpc<SettingsDTO>(OpGetSettings, undefined, signal),
	])

	signal?.throwIfAborted()

	if (!org.id || !Number.isInteger(settings.response_deadline_days)) {
		throw new Error('No se pudo cargar la organización y su configuración.')
	}

	return {
		id: org.id,
		slug: org.slug,
		businessDomain: org.business_domain,
		name: org.name,
		legalName: org.legal_name,
		taxId: org.tax_id,
		ubigeoId: org.ubigeo_id,
		addressType: org.address_type,
		address: org.address,
		phoneCode: org.phone_code,
		phone: org.phone,
		website: org.website,
		primaryColor: org.primary_color,
		logoKey: org.logo_key,
		responseDeadlineDays: settings.response_deadline_days,
		formEnabled: settings.form_enabled,
		mcpEnabledTools: settings.mcp_enabled_tools,
		mcpShowSensitiveData: settings.mcp_show_sensitive_data,
	}
}

interface SettingsInput {
	slug: string
	businessDomain: string | null
	name: string | null
	legalName: string | null
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	phoneCode: string | null
	phone: string | null
	website: string | null
	primaryColor: string | null
	formEnabled: boolean
	responseDeadlineDays: number | null
	mcpEnabledTools: string[]
	mcpShowSensitiveData: boolean
}

export async function updateOrganizationSettings(
	input: SettingsInput,
	signal?: AbortSignal,
) {
	let organizationSaved = false

	try {
		signal?.throwIfAborted()

		await rpc(
			OpUpdateOrganization,
			{
				data: {
					name: input.name?.trim(),
					slug: input.slug,
					business_domain:
						input.businessDomain?.trim().toLowerCase() || null,
					legal_name: input.legalName?.trim(),
					ubigeo_id: input.ubigeoId,
					address_type: input.addressType,
					address: input.address?.trim(),
					phone_code: input.phoneCode,
					phone: input.phone,
					website: input.website,
					primary_color: input.primaryColor,
				},
			},
			signal,
		)

		organizationSaved = true
		signal?.throwIfAborted()

		await rpc(
			OpUpdateSettings,
			{
				data: {
					form_enabled: input.formEnabled,
					response_deadline_days: input.responseDeadlineDays,
					mcp_enabled_tools: input.mcpEnabledTools,
					mcp_show_sensitive_data: input.mcpShowSensitiveData,
				},
			},
			signal,
		)

		signal?.throwIfAborted()

		return { success: true }
	} catch (error) {
		if (signal?.aborted) {
			throw error
		}

		const message =
			error instanceof Error ? error.message : 'Inténtalo nuevamente.'

		return {
			error: organizationSaved
				? `La información general se guardó, pero no los ajustes del formulario/MCP: ${message}`
				: message,
		}
	}
}

export async function removeOrganizationLogo(signal?: AbortSignal) {
	try {
		await rpc(OpRemoveLogo, undefined, signal)

		return { success: true }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo quitar el logo.',
		}
	}
}

export async function loadSSOSettings(signal?: AbortSignal) {
	const list = async () => {
		const connections: SSOConnection[] = []

		for (let page = 1; ; page++) {
			signal?.throwIfAborted()

			const result = await rpc<{
				rows?: SSOConnection[] | null
				total: number
			}>(OpListSSOConnections, { page, pageSize: 100 }, signal)

			signal?.throwIfAborted()

			const rows = result.rows ?? []

			connections.push(...rows)

			if (!rows.length || connections.length >= result.total) {
				return connections
			}
		}
	}

	const [connections, policy] = await Promise.all([
		list(),
		rpc<SSOPolicy>(OpGetSSOSettings, undefined, signal),
	])

	signal?.throwIfAborted()

	if (!['local', 'mixed', 'sso_required'].includes(policy.login_mode)) {
		throw new Error('No se pudo cargar la política SSO.')
	}

	return { connections, policy }
}

export async function searchUbigeos(search: string) {
	const result = await rpc<{ rows?: { id: string; name: string }[] | null }>(
		OpListUbigeos,
		{ filters: { search }, page: 1, pageSize: 100 },
	)

	return (result.rows ?? []).map((row) => ({
		value: row.id,
		label: row.name,
	}))
}
