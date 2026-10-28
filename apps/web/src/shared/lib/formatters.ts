import { TZDate } from '@date-fns/tz'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BUSINESS_TIME_ZONE } from '../constants/options'

function displayDate(date: Date | string): Date {
	// Una fecha calendario no es un instante UTC: conservar su día tal cual.
	if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return parseISO(date)
	}

	return new TZDate(
		typeof date === 'string' ? new Date(date) : date,
		BUSINESS_TIME_ZONE,
	)
}

export const formatDateForQuery = (date: Date | null): string | undefined => {
	if (!date) {
		return undefined
	}
	return format(date, 'yyyy-MM-dd')
}

export const formatDateDisplay = (date: Date | string): string => {
	return format(displayDate(date), 'dd/MM/yyyy', { locale: es })
}

export const formatDateTimeDisplay = (date: Date | string): string => {
	return format(displayDate(date), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export const formatDateLong = (date: Date | string): string => {
	return format(displayDate(date), "d 'de' MMMM 'de' yyyy", { locale: es })
}

export const formatDateRelative = (date: Date | string): string => {
	const dateObj = displayDate(date)
	const now = new TZDate(new Date(), BUSINESS_TIME_ZONE)
	const diffInDays = differenceInCalendarDays(now, dateObj)

	if (diffInDays === 0) {
		return 'Hoy'
	}
	if (diffInDays === 1) {
		return 'Ayer'
	}
	if (diffInDays < 0) {
		return formatDateDisplay(date)
	}
	if (diffInDays < 7) {
		return `Hace ${diffInDays} días`
	}

	if (diffInDays < 30) {
		const weeks = Math.floor(diffInDays / 7)

		return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
	}

	if (diffInDays < 365) {
		const months = Math.floor(diffInDays / 30)

		return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`
	}

	const years = Math.floor(diffInDays / 365)

	return `Hace ${years} ${years === 1 ? 'año' : 'años'}`
}
