import { describe, expect, it } from 'vitest'
import {
	formatDateDisplay,
	formatDateForQuery,
	formatDateLong,
	formatDateRelative,
	formatDateTimeDisplay,
} from './formatters'

describe('formatters', () => {
	describe('formatDateForQuery', () => {
		it('should return undefined for null date', () => {
			expect(formatDateForQuery(null)).toBeUndefined()
		})

		it('should format date to YYYY-MM-DD', () => {
			const date = new Date('2024-03-15T10:30:00')
			expect(formatDateForQuery(date)).toBe('2024-03-15')
		})

		it('should handle single digit month and day', () => {
			const date = new Date('2024-01-05T10:30:00')
			expect(formatDateForQuery(date)).toBe('2024-01-05')
		})
	})

	describe('formatDateDisplay', () => {
		it('should format date to DD/MM/YYYY', () => {
			const date = new Date('2024-03-15T10:30:00')
			expect(formatDateDisplay(date)).toBe('15/03/2024')
		})

		it('should accept string dates', () => {
			expect(formatDateDisplay('2024-12-25T00:00:00')).toBe('25/12/2024')
		})

		it('should handle single digit day and month', () => {
			const date = new Date('2024-01-05T10:30:00')
			expect(formatDateDisplay(date)).toBe('05/01/2024')
		})
	})

	describe('formatDateTimeDisplay', () => {
		it('should format datetime with hours and minutes', () => {
			const date = new Date('2024-03-15T14:30:00')
			expect(formatDateTimeDisplay(date)).toBe('15/03/2024 a las 14:30')
		})

		it('should accept string dates', () => {
			expect(formatDateTimeDisplay('2024-12-25T09:15:00')).toBe(
				'25/12/2024 a las 09:15',
			)
		})
	})

	describe('formatDateLong', () => {
		it('should format date in long format', () => {
			const date = new Date('2024-03-15T10:30:00')
			expect(formatDateLong(date)).toBe('15 de marzo de 2024')
		})

		it('should accept string dates', () => {
			expect(formatDateLong('2024-01-01T00:00:00')).toBe(
				'1 de enero de 2024',
			)
		})
	})

	describe('formatDateRelative', () => {
		it('should return "Hoy" for today', () => {
			const today = new Date()
			expect(formatDateRelative(today)).toBe('Hoy')
		})

		it('should return "Ayer" for yesterday', () => {
			const yesterday = new Date()
			yesterday.setDate(yesterday.getDate() - 1)
			expect(formatDateRelative(yesterday)).toBe('Ayer')
		})

		it('should return days for dates within a week', () => {
			const threeDaysAgo = new Date()
			threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
			expect(formatDateRelative(threeDaysAgo)).toBe('Hace 3 dias')
		})

		it('should return weeks for dates within a month', () => {
			const twoWeeksAgo = new Date()
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
			expect(formatDateRelative(twoWeeksAgo)).toBe('Hace 2 semanas')
		})

		it('should return months for dates within a year', () => {
			const threeMonthsAgo = new Date()
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
			expect(formatDateRelative(threeMonthsAgo)).toMatch(/Hace \d+ mes/)
		})

		it('should return years for dates over a year ago', () => {
			const twoYearsAgo = new Date()
			twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
			expect(formatDateRelative(twoYearsAgo)).toBe('Hace 2 años')
		})

		it('should handle singular forms', () => {
			const oneWeekAgo = new Date()
			oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
			expect(formatDateRelative(oneWeekAgo)).toBe('Hace 1 semana')
		})
	})
})
