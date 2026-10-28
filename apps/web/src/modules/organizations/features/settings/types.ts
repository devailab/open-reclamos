export interface OrganizationDTO {
	id: string
	slug: string
	business_domain: string | null
	name: string
	legal_name: string
	tax_id: string
	ubigeo_id: string
	address_type: string
	address: string
	phone_code: string | null
	phone: string | null
	website: string | null
	primary_color: string | null
	logo_key: string | null
}

export interface SettingsDTO {
	response_deadline_days: number
	form_enabled: boolean
	mcp_enabled_tools: string[] | null
	mcp_show_sensitive_data: boolean
}

export interface OrganizationSettings {
	id: string
	slug: string
	businessDomain: string | null
	name: string
	legalName: string
	taxId: string
	ubigeoId: string
	addressType: string
	address: string
	phoneCode: string | null
	phone: string | null
	website: string | null
	primaryColor: string | null
	logoKey: string | null
	responseDeadlineDays: number
	formEnabled: boolean
	mcpEnabledTools: string[] | null
	mcpShowSensitiveData: boolean
}

export interface SSOConnection {
	id: string
	protocol: 'oidc' | 'saml'
	name: string
	status: string
	config_version: number
	tested_version: number | null
	tested_at: string | null
}

export interface SSOPolicy {
	login_mode: 'local' | 'mixed' | 'sso_required'
	active_connection_id: string | null
	policy_version: number
}
