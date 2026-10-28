export interface StoreDTO {
	id: string
	name: string
	slug: string
	type: string
	color: string
	ubigeo_id: string | null
	address_type: string | null
	address: string | null
	url: string | null
	form_enabled: boolean
	deleted_at: string | null
	created_at: string
	updated_at: string | null
}

export interface StoreRow {
	id: string
	name: string
	slug: string
	type: string
	color: string
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	url: string | null
	formEnabled: boolean
	deletedAt: string | null
	createdAt: string
	updatedAt: string | null
}

export function toStoreRow(row: StoreDTO): StoreRow {
	return {
		...row,
		ubigeoId: row.ubigeo_id,
		addressType: row.address_type,
		formEnabled: row.form_enabled,
		deletedAt: row.deleted_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}
