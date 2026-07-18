export function buildSlugBase(name: string, fallback = ''): string {
	const base = name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)

	return base || fallback
}

export async function resolveUniqueSlug(
	base: string,
	slugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
	let slug = base
	let counter = 2

	while (await slugExists(slug)) {
		slug = `${base}-${counter}`
		counter++
	}

	return slug
}
