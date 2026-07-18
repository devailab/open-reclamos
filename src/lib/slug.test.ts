import { describe, expect, it } from 'bun:test'
import { buildSlugBase, resolveUniqueSlug } from './slug'

describe('buildSlugBase', () => {
	it('normaliza minúsculas, acentos y espacios', () => {
		expect(buildSlugBase('Tienda Ñoño  Café')).toBe('tienda-nono-cafe')
	})

	it('elimina caracteres no alfanuméricos', () => {
		expect(buildSlugBase('Mi Tienda! (Centro) #1')).toBe(
			'mi-tienda-centro-1',
		)
	})

	it('colapsa guiones múltiples', () => {
		expect(buildSlugBase('a - b -- c')).toBe('a-b-c')
	})

	it('trunca a 50 caracteres', () => {
		expect(buildSlugBase('x'.repeat(80))).toHaveLength(50)
	})

	it('usa el fallback cuando el nombre queda vacío', () => {
		expect(buildSlugBase('¡¡¡')).toBe('')
		expect(buildSlugBase('¡¡¡', 'tienda')).toBe('tienda')
	})
})

describe('resolveUniqueSlug', () => {
	it('devuelve la base cuando está libre', async () => {
		const slug = await resolveUniqueSlug('tienda', async () => false)
		expect(slug).toBe('tienda')
	})

	it('agrega sufijos incrementales hasta encontrar uno libre', async () => {
		const taken = new Set(['tienda', 'tienda-2', 'tienda-3'])
		const slug = await resolveUniqueSlug('tienda', async (s) =>
			taken.has(s),
		)
		expect(slug).toBe('tienda-4')
	})
})
