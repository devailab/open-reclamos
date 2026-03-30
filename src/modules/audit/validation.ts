import { endOfDay, isValid, startOfDay } from 'date-fns'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_TEXT_FILTER_LENGTH = 120
const MAX_USER_SEARCH_LENGTH = 80

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/

export interface AuditTableFiltersInput {
	action: string | null | undefined
	entityType: string | null | undefined
	entityId: string | null | undefined
	userId: string | null | undefined
	createdAtStart: Date | string | null | undefined
	createdAtEnd: Date | string | null | undefined
}

export interface AuditTableFilters {
	action: string
	entityType: string
	entityId: string
	userId: string
	createdAtStart: Date
	createdAtEnd: Date
}

export const getTodayAuditDateRange = (baseDate = new Date()) => {
	return {
		createdAtStart: startOfDay(baseDate),
		createdAtEnd: endOfDay(baseDate),
	}
}

export const createDefaultAuditTableFilters = (
	baseDate = new Date(),
): AuditTableFilters => {
	const { createdAtStart, createdAtEnd } = getTodayAuditDateRange(baseDate)

	return {
		action: '',
		entityType: '',
		entityId: '',
		userId: '',
		createdAtStart,
		createdAtEnd,
	}
}

const normalizeOptionalText = (value: string | null | undefined): string => {
	return (value ?? '').trim().slice(0, MAX_TEXT_FILTER_LENGTH)
}

const normalizeOptionalDate = (
	value: Date | string | null | undefined,
): Date | null => {
	if (!value) return null

	const parsedDate = typeof value === 'string' ? new Date(value) : value
	if (!(parsedDate instanceof Date) || !isValid(parsedDate)) {
		return null
	}

	return parsedDate
}

export const normalizeAuditTableFilters = (
	filters?: Partial<AuditTableFiltersInput>,
): AuditTableFilters => {
	const defaults = createDefaultAuditTableFilters()

	const parsedStart = normalizeOptionalDate(filters?.createdAtStart)
	const parsedEnd = normalizeOptionalDate(filters?.createdAtEnd)

	return {
		action: normalizeOptionalText(filters?.action),
		entityType: normalizeOptionalText(filters?.entityType),
		entityId: normalizeOptionalText(filters?.entityId),
		userId: normalizeOptionalText(filters?.userId),
		createdAtStart: parsedStart
			? startOfDay(parsedStart)
			: defaults.createdAtStart,
		createdAtEnd: parsedEnd ? endOfDay(parsedEnd) : defaults.createdAtEnd,
	}
}

export const validateAuditTableFilters = (
	filters: AuditTableFilters,
): string | null => {
	if (filters.entityId && !UUID_PATTERN.test(filters.entityId)) {
		return 'El identificador de entidad no es válido.'
	}

	if (filters.userId && !UUID_PATTERN.test(filters.userId)) {
		return 'El identificador de usuario no es válido.'
	}

	if (filters.createdAtStart > filters.createdAtEnd) {
		return 'La fecha de inicio no puede ser mayor a la fecha de fin.'
	}

	return null
}

export const normalizeAuditTablePagination = (
	page: number,
	pageSize: number,
): { page: number; pageSize: number } => {
	const normalizedPage =
		Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE

	const normalizedPageSize =
		Number.isFinite(pageSize) && pageSize > 0
			? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE)
			: DEFAULT_PAGE_SIZE

	return {
		page: normalizedPage,
		pageSize: normalizedPageSize,
	}
}

export const normalizeAuditUserSearchQuery = (
	query: string | null | undefined,
): string => {
	return (query ?? '').trim().slice(0, MAX_USER_SEARCH_LENGTH)
}
