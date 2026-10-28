export interface SessionDTO {
	user: {
		id: string
		name: string
		last_name: string
		email: string
		is_platform_admin: boolean
	}
	organization_id: string
	auth_method: string
	role?: string
}

export interface PageDTO<T> {
	rows: T[] | null
	total: number
	page: number
	page_size: number
}

export interface OrganizationDTO {
	id: string
	name: string
	slug: string
	role: string
	status: string
}

export interface InstallationStatus {
	installed: boolean
	public_registration: boolean
}

export interface LoginOptions {
	organization: { slug: string; name: string }
	login_mode: 'local' | 'mixed' | 'sso_required'
	sso?: { name: string; protocol: string; start_url: string }
}

export interface InvitationDTO {
	id: string
	organization_name: string
	email: string
	role: string
	expires_at: string
}
