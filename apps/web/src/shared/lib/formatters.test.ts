import { describe, expect, test } from 'bun:test'
import {
	formatDateDisplay,
	formatDateForQuery,
	formatDateLong,
	formatDateTimeDisplay,
} from './formatters'

describe('Fechas calendario y hora de negocio peruana', () => {
	test('una etiqueta YYYY-MM-DD conserva el día sin interpretarlo como UTC', () => {
		expect(formatDateDisplay('2026-10-03')).toBe('03/10/2026')
		expect(formatDateLong('2026-10-03')).toBe('3 de octubre de 2026')
	})

	test('un timestamp UTC se presenta en America/Lima', () => {
		expect(formatDateTimeDisplay('2026-10-03T02:30:00Z')).toBe(
			'02/10/2026 a las 21:30',
		)

		expect(formatDateDisplay('2026-10-03T02:30:00Z')).toBe('02/10/2026')
	})

	test('Date y timestamp explícito producen la misma hora', () => {
		expect(formatDateTimeDisplay(new Date('2026-10-03T12:00:00Z'))).toBe(
			'03/10/2026 a las 07:00',
		)

		expect(formatDateTimeDisplay('2026-10-03T07:00:00-05:00')).toBe(
			'03/10/2026 a las 07:00',
		)
	})

	test('los filtros conservan el día seleccionado en el calendario local', () => {
		expect(formatDateForQuery(new Date(2026, 9, 3))).toBe('2026-10-03')
		expect(formatDateForQuery(null)).toBeUndefined()
	})
})
