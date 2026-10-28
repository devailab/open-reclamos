export interface UserOrganizationOption {
	id: string
	name: string
	slug: string
	role?: string
	status?: string
	logoKey: string | null
	logoVersion?: string | null
}

export interface StoreOption {
	id: string
	name: string
}
