import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatDateForQuery = (date: Date | null): string | undefined => {
	if (!date) return undefined
	return format(date, 'yyyy-MM-dd')
}

export const formatDateDisplay = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date
	return format(dateObj, 'dd/MM/yyyy', { locale: es })
}

export const formatDateTimeDisplay = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date
	return format(dateObj, "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export const formatDateLong = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date
	return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export const formatDateRelative = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date
	const now = new Date()
	const diffInMs = now.getTime() - dateObj.getTime()
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

	if (diffInDays === 0) return 'Hoy'
	if (diffInDays === 1) return 'Ayer'
	if (diffInDays < 7) return `Hace ${diffInDays} dias`
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
