import { describe, expect, it } from 'bun:test'
import { MAX_SUSPENSION_REASON_LENGTH } from './constants'
import {
	DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS,
	normalizePlatformOrganizationsTableFilters,
	normalizePlatformPagination,
	normalizeSuspensionReason,
	validateOrganizationId,
	validateSuspensionReason,
} from './validation'

describe('suspension reason validation', () => {
	it('exige un motivo con contenido real', () => {
		expect(validateSuspensionReason(null)).not.toBeNull()
		expect(
			validateSuspensionReason(normalizeSuspensionReason('   ')),
		).not.toBeNull()
		expect(
			validateSuspensionReason(normalizeSuspensionReason('abc')),
		).not.toBeNull()
	})

	it('acepta un motivo válido y recorta espacios', () => {
		const reason = normalizeSuspensionReason('  Falta de pago  ')

		expect(reason).toBe('Falta de pago')
		expect(validateSuspensionReason(reason)).toBeNull()
	})

	it('trunca motivos que exceden el límite', () => {
		const reason = normalizeSuspensionReason('a'.repeat(600))

		expect(reason).toHaveLength(MAX_SUSPENSION_REASON_LENGTH)
	})
})

describe('organization id validation', () => {
	it('rechaza identificadores vacíos o con formato inválido', () => {
		expect(validateOrganizationId('')).not.toBeNull()
		expect(validateOrganizationId('   ')).not.toBeNull()
		expect(validateOrganizationId('not-a-uuid')).not.toBeNull()
	})

	it('acepta un UUID', () => {
		expect(
			validateOrganizationId('0195f3a0-1b2c-7d3e-8f40-51627384950a'),
		).toBeNull()
	})
})

describe('platform table filters', () => {
	it('cae en los valores por defecto ante entradas inválidas', () => {
		const filters = normalizePlatformOrganizationsTableFilters({
			status: 'deleted' as never,
		})

		expect(filters).toEqual(DEFAULT_PLATFORM_ORGANIZATIONS_TABLE_FILTERS)
	})

	it('conserva un estado válido y normaliza la búsqueda', () => {
		const filters = normalizePlatformOrganizationsTableFilters({
			name: '  Acme  ',
			status: 'suspended',
		})

		expect(filters).toEqual({ name: 'Acme', status: 'suspended' })
	})

	it('acota la paginación a rangos seguros', () => {
		expect(normalizePlatformPagination(0, 0)).toEqual({
			page: 1,
			pageSize: 10,
		})
		expect(normalizePlatformPagination(3, 5000)).toEqual({
			page: 3,
			pageSize: 100,
		})
		expect(normalizePlatformPagination(Number.NaN, Number.NaN)).toEqual({
			page: 1,
			pageSize: 10,
		})
	})
})
