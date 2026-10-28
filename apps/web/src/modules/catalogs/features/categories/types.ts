export interface CategoryDTO {
	id: string
	name: string
	description: string | null
	created_at: string
	updated_at: string | null
}

export interface CategoryRow {
	id: string
	name: string
	description: string | null
	createdAt: string
	updatedAt: string | null
}
