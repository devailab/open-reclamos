import { describe, expect, it, vi } from 'vitest'

import { combine, email, minLength, required } from '@/lib/validators'

describe('validators', () => {
	describe('required', () => {
		it('returns an error for null, undefined and empty string', () => {
			expect(required(null)).toBe('Este campo es requerido')
			expect(required(undefined)).toBe('Este campo es requerido')
			expect(required('')).toBe('Este campo es requerido')
		})

		it('returns null for non-empty values', () => {
			expect(required('hola')).toBeNull()
			expect(required(0)).toBeNull()
			expect(required(false)).toBeNull()
		})
	})

	describe('email', () => {
		it('allows empty values', () => {
			expect(email('')).toBeNull()
			expect(email(null)).toBeNull()
			expect(email(undefined)).toBeNull()
		})

		it('returns an error for invalid format', () => {
			expect(email('correo-invalido')).toBe('Ingresa un email válido')
			expect(email('user @example.com')).toBe('Ingresa un email válido') // espacios
			expect(email('user@')).toBe('Ingresa un email válido') // sin dominio
		})

		it('returns null for valid format', () => {
			expect(email('user@example.com')).toBeNull()
			expect(email('admin@mail.empresa.pe')).toBeNull() // subdominios
		})
	})

	describe('minLength', () => {
		it('returns default error when value is shorter than min', () => {
			const validate = minLength(8)
			expect(validate('1234567')).toBe('Debe tener al menos 8 caracteres')
		})

		it('returns custom message when provided', () => {
			const validate = minLength(8, 'Minimo 8 caracteres')
			expect(validate('1234')).toBe('Minimo 8 caracteres')
		})

		it('returns null when value has required length', () => {
			const validate = minLength(8)
			expect(validate('12345678')).toBeNull()
		})

		it('trata null como string vacío (longitud 0)', () => {
			const validate = minLength(1)
			expect(validate(null)).toBe('Debe tener al menos 1 caracteres')
		})
	})

	describe('combine', () => {
		it('returns null when all validators pass', () => {
			const validate = combine(required, email)
			expect(validate('user@example.com')).toBeNull()
		})

		it('returns the first error and short-circuits execution', () => {
			const first = vi.fn(() => 'error-1')
			const second = vi.fn(() => 'error-2')
			const validate = combine(first, second)

			expect(validate('any')).toBe('error-1')
			expect(first).toHaveBeenCalledTimes(1)
			expect(second).not.toHaveBeenCalled()
		})

		it('retorna el error del segundo si el primero pasa', () => {
			const validate = combine(required, email)
			expect(validate('noesvalido')).toBe('Ingresa un email válido')
		})
	})
})
