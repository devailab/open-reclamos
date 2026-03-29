import { buildOrganizationScopedKey, slugifyRbacName } from '@/modules/rbac/lib'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 240

export const ROLE_SCOPE_FILTERS = ['all', 'system', 'custom'] as const
export type RoleScopeFilter = (typeof ROLE_SCOPE_FILTERS)[number]

export interface RolesTableFilters {
	search: string
	scope: RoleScopeFilter
}

export interface RoleMutationInput {
	name: string
	description: string | null
	permissionIds: string[]
}

export interface NormalizedRoleMutationInput {
	name: string
	description: string | null
	permissionIds: string[]
	slug: string
}

export const DEFAULT_ROLES_TABLE_FILTERS: RolesTableFilters = {
	search: '',
	scope: 'all',
}

const isRoleScopeFilter = (value: string): value is RoleScopeFilter => {
	return ROLE_SCOPE_FILTERS.includes(value as RoleScopeFilter)
}

const normalizeOptionalString = (
	value: string | null | undefined,
): string | null => {
	const trimmed = value?.trim() ?? ''
	return trimmed.length > 0 ? trimmed : null
}

export const normalizeRoleMutationInput = (
	input: RoleMutationInput,
): NormalizedRoleMutationInput => {
	const name = input.name.trim()

	return {
		name,
		description: normalizeOptionalString(input.description),
		permissionIds: Array.from(
			new Set(
				input.permissionIds
					.map((permissionId) => permissionId.trim())
					.filter(Boolean),
			),
		),
		slug: slugifyRbacName(name),
	}
}

export const buildCustomRoleKey = (
	organizationId: string,
	input: NormalizedRoleMutationInput,
) => {
	return buildOrganizationScopedKey('role', organizationId, input.slug)
}

export const validateRoleMutationInput = (
	input: NormalizedRoleMutationInput,
): string | null => {
	if (!input.name) return 'El nombre del rol es requerido.'
	if (input.name.length < 3) {
		return 'El nombre del rol debe tener al menos 3 caracteres.'
	}
	if (input.name.length > MAX_NAME_LENGTH) {
		return 'El nombre del rol no puede superar los 120 caracteres.'
	}
	if (
		input.description &&
		input.description.length > MAX_DESCRIPTION_LENGTH
	) {
		return 'La descripcion no puede superar los 240 caracteres.'
	}
	if (!input.slug) return 'No se pudo generar un identificador para el rol.'
	if (input.permissionIds.length === 0) {
		return 'Selecciona al menos un permiso para el rol.'
	}

	return null
}

export const validateRoleId = (value: string): string | null => {
	if (!value || value.trim() === '') return 'El rol es requerido.'
	if (!/^[0-9a-fA-F-]{36}$/.test(value.trim())) {
		return 'El identificador del rol no es valido.'
	}
	return null
}

export const normalizeRolesTableFilters = (
	filters?: Partial<RolesTableFilters>,
): RolesTableFilters => {
	return {
		search: (filters?.search ?? '').trim().slice(0, MAX_NAME_LENGTH),
		scope: isRoleScopeFilter(filters?.scope ?? '')
			? (filters?.scope ?? DEFAULT_ROLES_TABLE_FILTERS.scope)
			: DEFAULT_ROLES_TABLE_FILTERS.scope,
	}
}

export const normalizeRolesPagination = (page: number, pageSize: number) => {
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
