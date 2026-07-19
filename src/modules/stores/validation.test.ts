import { describe, expect, it } from 'bun:test'
import {
	normalizeStoreMutationInput,
	validateStoreColor,
	validateStoreMutationInput,
} from './validation'

const VALID_INPUT = {
	name: 'Tienda Principal',
	type: 'virtual',
	color: '#4f46e5',
	ubigeoId: null,
	addressType: null,
	address: null,
	url: 'https://example.com',
}

describe('store color validation', () => {
	it('normaliza el color hexadecimal a mayúsculas', () => {
		const input = normalizeStoreMutationInput(VALID_INPUT)

		expect(input.color).toBe('#4F46E5')
		expect(validateStoreMutationInput(input)).toBeNull()
	})

	it('rechaza colores que no usan el formato hexadecimal completo', () => {
		expect(validateStoreColor('#FFF')).not.toBeNull()
		expect(validateStoreColor('red')).not.toBeNull()
		expect(validateStoreColor(undefined)).not.toBeNull()
	})
})
