import { combine, email, minLength, required } from '@/lib/validators'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_SEARCH_LENGTH = 120
const MAX_NAME_LENGTH = 120

export const USER_STORE_ACCESS_MODES = ['all', 'selected'] as const
export type UserStoreAccessMode = (typeof USER_STORE_ACCESS_MODES)[number]
export type StoreAccessMode = UserStoreAccessMode

export type UsersTableStatusFilter = 'all' | 'active' | 'pending'
export type UsersTableStoreAccessFilter = 'any' | 'all' | 'selected'

export interface UsersTableFilters {
	search: string
	status: UsersTableStatusFilter
	roleId: string
	storeAccessMode: UsersTableStoreAccessFilter
}

export interface InvitationMutationInput {
	email: string
	roleId: string
	storeAccessMode: UserStoreAccessMode
	storeIds: string[]
}

export interface MemberAccessMutationInput {
	userId: string
	roleId: string
	storeAccessMode: UserStoreAccessMode
	storeIds: string[]
	permissionIds: string[]
}

export interface AcceptInvitationInput {
	token: string
	name: string
	password: string
	confirmPassword?: string
}

export type UserInvitationInput = InvitationMutationInput
export type UpdateUserAccessInput = MemberAccessMutationInput

export const DEFAULT_USERS_TABLE_FILTERS: UsersTableFilters = {
	search: '',
	status: 'all',
	roleId: 'all',
	storeAccessMode: 'any',
}

const isUserStoreAccessMode = (value: string): value is UserStoreAccessMode => {
	return USER_STORE_ACCESS_MODES.includes(value as UserStoreAccessMode)
}

const normalizeIds = (values: string[]) => {
	return Array.from(
		new Set(
			values
				.map((value) => value.trim())
				.filter((value) => value.length > 0),
		),
	)
}

export const normalizeUsersTableFilters = (
	filters?: Partial<UsersTableFilters>,
): UsersTableFilters => {
	return {
		search: (filters?.search ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
		status:
			filters?.status === 'active' || filters?.status === 'pending'
				? filters.status
				: 'all',
		roleId: (filters?.roleId ?? 'all').trim() || 'all',
		storeAccessMode:
			filters?.storeAccessMode === 'all' ||
			filters?.storeAccessMode === 'selected'
				? filters.storeAccessMode
				: 'any',
	}
}

export const normalizeInvitationMutationInput = (
	input: InvitationMutationInput,
) => {
	return {
		email: input.email.trim().toLowerCase(),
		roleId: input.roleId.trim(),
		storeAccessMode: isUserStoreAccessMode(input.storeAccessMode)
			? input.storeAccessMode
			: 'all',
		storeIds: normalizeIds(input.storeIds),
	}
}

export const normalizeInvitationInput = normalizeInvitationMutationInput

export const normalizeMemberAccessMutationInput = (
	input: MemberAccessMutationInput,
) => {
	return {
		userId: input.userId.trim(),
		roleId: input.roleId.trim(),
		storeAccessMode: isUserStoreAccessMode(input.storeAccessMode)
			? input.storeAccessMode
			: 'all',
		storeIds: normalizeIds(input.storeIds),
		permissionIds: normalizeIds(input.permissionIds),
	}
}

export const normalizeUpdateUserAccessInput = normalizeMemberAccessMutationInput

export const normalizeAcceptInvitationInput = (
	input: AcceptInvitationInput,
) => {
	const confirmPassword = input.confirmPassword ?? input.password
	return {
		token: input.token.trim(),
		name: input.name.trim(),
		password: input.password,
		confirmPassword,
	}
}

export const validateInvitationMutationInput = (
	input: ReturnType<typeof normalizeInvitationMutationInput>,
) => {
	if (!input.email) return 'El correo es requerido.'
	const emailError = email(input.email)
	if (emailError) return emailError
	if (!input.roleId) return 'El rol es requerido.'
	if (input.storeAccessMode === 'selected' && input.storeIds.length === 0) {
		return 'Selecciona al menos una tienda.'
	}
	return null
}

export const validateInvitationInput = validateInvitationMutationInput

export const validateMemberAccessMutationInput = (
	input: ReturnType<typeof normalizeMemberAccessMutationInput>,
) => {
	if (!input.userId) return 'El usuario es requerido.'
	if (!input.roleId) return 'El rol es requerido.'
	if (input.storeAccessMode === 'selected' && input.storeIds.length === 0) {
		return 'Selecciona al menos una tienda.'
	}
	return null
}

export const validateUpdateUserAccessInput = validateMemberAccessMutationInput

export const validateAcceptInvitationInput = (
	input: ReturnType<typeof normalizeAcceptInvitationInput>,
) => {
	if (!input.token) return 'El enlace de invitación no es válido.'
	if (!input.name) return 'El nombre es requerido.'
	if (input.name.length > MAX_NAME_LENGTH) {
		return 'El nombre no puede superar los 120 caracteres.'
	}
	const passwordError = combine(
		required,
		minLength(8, 'La contraseña debe tener al menos 8 caracteres'),
	)(input.password)
	if (passwordError) return passwordError
	if (input.password !== input.confirmPassword) {
		return 'Las contraseñas no coinciden.'
	}
	return null
}

export const normalizeUsersPagination = (page: number, pageSize: number) => {
	const normalizedPage =
		Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE
	const normalizedPageSize =
		Number.isFinite(pageSize) && pageSize > 0
			? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE)
			: DEFAULT_PAGE_SIZE

	return { page: normalizedPage, pageSize: normalizedPageSize }
}
