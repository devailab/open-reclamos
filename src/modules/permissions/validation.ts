import { buildOrganizationScopedKey, slugifyRbacName } from '@/modules/rbac/lib'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 240

export const PERMISSION_SCOPE_FILTERS = ['all', 'system', 'custom'] as const
export type PermissionScopeFilter = (typeof PERMISSION_SCOPE_FILTERS)[number]

export interface PermissionsTableFilters {
	search: string
	module: string
	scope: PermissionScopeFilter
}

export interface PermissionMutationInput {
	name: string
	module: string
	description: string | null
}

export interface NormalizedPermissionMutationInput {
	name: string
	module: string
	description: string | null
	slug: string
}

export const DEFAULT_PERMISSIONS_TABLE_FILTERS: PermissionsTableFilters = {
	search: '',
	module: 'all',
	scope: 'all',
}

const isPermissionScopeFilter = (
	value: string,
): value is PermissionScopeFilter => {
	return PERMISSION_SCOPE_FILTERS.includes(value as PermissionScopeFilter)
}

const normalizeOptionalString = (
	value: string | null | undefined,
): string | null => {
	const trimmed = value?.trim() ?? ''
	return trimmed.length > 0 ? trimmed : null
}

export const normalizePermissionMutationInput = (
	input: PermissionMutationInput,
): NormalizedPermissionMutationInput => {
	const name = input.name.trim()
	return {
		name,
		module: input.module.trim().toLowerCase(),
		description: normalizeOptionalString(input.description),
		slug: slugifyRbacName(name),
	}
}

export const buildCustomPermissionKey = (
	organizationId: string,
	input: NormalizedPermissionMutationInput,
) => {
	return buildOrganizationScopedKey('permission', organizationId, input.slug)
}

export const validatePermissionMutationInput = (
	input: NormalizedPermissionMutationInput,
): string | null => {
	if (!input.name) return 'El nombre del permiso es requerido.'
	if (input.name.length < 3) {
		return 'El nombre del permiso debe tener al menos 3 caracteres.'
	}
	if (input.name.length > MAX_NAME_LENGTH) {
		return 'El nombre del permiso no puede superar los 120 caracteres.'
	}
	if (!input.module) return 'El modulo es requerido.'
	if (!/^[a-z0-9-]+$/.test(input.module)) {
		return 'El modulo solo puede contener letras minusculas, numeros y guiones.'
	}
	if (!input.slug)
		return 'No se pudo generar un identificador para el permiso.'
	if (
		input.description &&
		input.description.length > MAX_DESCRIPTION_LENGTH
	) {
		return 'La descripcion no puede superar los 240 caracteres.'
	}

	return null
}

export const validatePermissionId = (value: string): string | null => {
	if (!value || value.trim() === '') return 'El permiso es requerido.'
	if (!/^[0-9a-fA-F-]{36}$/.test(value.trim())) {
		return 'El identificador del permiso no es valido.'
	}
	return null
}

export const normalizePermissionsTableFilters = (
	filters?: Partial<PermissionsTableFilters>,
): PermissionsTableFilters => {
	const scope = isPermissionScopeFilter(filters?.scope ?? '')
		? (filters?.scope ?? DEFAULT_PERMISSIONS_TABLE_FILTERS.scope)
		: DEFAULT_PERMISSIONS_TABLE_FILTERS.scope

	return {
		search: (filters?.search ?? '').trim().slice(0, MAX_NAME_LENGTH),
		module: (filters?.module ?? 'all').trim().toLowerCase() || 'all',
		scope,
	}
}

export const normalizePermissionsPagination = (
	page: number,
	pageSize: number,
) => {
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
