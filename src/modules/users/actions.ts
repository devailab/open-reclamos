'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import {
	organizationInvitationStores,
	organizationInvitations,
	organizationMemberStores,
	organizationMembers,
	organizations,
	users,
} from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { auth } from '@/lib/auth'
import { getSession } from '@/lib/auth-server'
import { sendEmail } from '@/lib/email'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { getRoleByIdForOrganization } from '@/modules/roles/queries'
import { createInvitationToken, hashInvitationToken } from './lib'
import {
	getExistingUserByEmail,
	getInvitationByIdForOrganization,
	getInvitationsTableForOrganization,
	getOpenInvitationByToken,
	getUserByIdForOrganization,
	getUserMembershipByEmail,
	getUsersTableForOrganization,
	getValidStoreIdsForOrganization,
	syncMemberPermissions,
	type UserTableRow,
} from './queries'
import { renderInvitationEmail } from './render-invitation-email'
import {
	type AcceptInvitationInput,
	normalizeInvitationInput,
	normalizeUpdateUserAccessInput,
	normalizeUsersPagination,
	normalizeUsersTableFilters,
	type StoreAccessMode,
	type UpdateUserAccessInput,
	type UserInvitationInput,
	type UsersTableFilters,
	validateAcceptInvitationInput,
	validateInvitationInput,
	validateUpdateUserAccessInput,
} from './validation'

const INVITATION_PATH_PREFIX = '/invite'
const INVITATION_EXPIRATION_DAYS = 7

export type UserActionResult = { error: string } | { success: true }

export type CreateInvitationActionResult =
	| { error: string }
	| { success: true; inviteUrl: string; token: string }

export interface GetUsersTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<UsersTableFilters>
}

export interface GetUsersTableActionResult {
	rows: UserTableRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: UsersTableFilters
}

export interface GetInvitationsTableActionResult {
	rows: Awaited<ReturnType<typeof getInvitationsTableForOrganization>>['rows']
	totalItems: number
	page: number
	pageSize: number
	filters: UsersTableFilters
}

export interface UserAccessActionResult {
	userId: string
	email: string
	name: string | null
	roleId: string
	storeAccessMode: StoreAccessMode
	storeIds: string[]
}

async function requireUsersAccess(permissionKey: string) {
	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')

	if (!hasPermission(membership, permissionKey)) {
		return {
			error: 'No tienes permisos para realizar esta acción.',
		} as const
	}

	return { session, membership } as const
}

async function validateRoleAndStores(
	organizationId: string,
	roleId: string,
	storeAccessMode: StoreAccessMode,
	storeIds: string[],
) {
	const role = await getRoleByIdForOrganization(roleId, organizationId)
	if (!role) return { error: 'El rol seleccionado no es válido.' } as const

	const validStoreIds =
		storeAccessMode === 'selected'
			? await getValidStoreIdsForOrganization(organizationId, storeIds)
			: []

	if (
		storeAccessMode === 'selected' &&
		validStoreIds.length !== storeIds.length
	) {
		return {
			error: 'Una o más tiendas seleccionadas no son válidas.',
		} as const
	}

	return { role, validStoreIds } as const
}

export async function $getUsersTableAction(
	input: GetUsersTableActionInput,
): Promise<GetUsersTableActionResult> {
	const access = await requireUsersAccess('users.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizeUsersTableFilters(),
		}
	}

	const { page, pageSize } = normalizeUsersPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeUsersTableFilters(input.filters)
	const { rows, totalItems } = await getUsersTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $getInvitationsTableAction(
	input: GetUsersTableActionInput,
): Promise<GetInvitationsTableActionResult> {
	const access = await requireUsersAccess('users.view')
	if ('error' in access) {
		return {
			rows: [],
			totalItems: 0,
			page: 1,
			pageSize: 10,
			filters: normalizeUsersTableFilters(),
		}
	}

	const { page, pageSize } = normalizeUsersPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeUsersTableFilters(input.filters)
	const { rows, totalItems } = await getInvitationsTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $createUserInvitationAction(
	input: UserInvitationInput,
): Promise<CreateInvitationActionResult> {
	const access = await requireUsersAccess('users.invite')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const normalizedInput = normalizeInvitationInput(input)
	const validationError = validateInvitationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const existingMembership = await getUserMembershipByEmail(
		normalizedInput.email,
		access.membership.organizationId,
	)
	if (existingMembership) {
		return { error: 'Ese correo ya pertenece a esta organización.' }
	}

	const existingUser = await getExistingUserByEmail(normalizedInput.email)
	if (existingUser) {
		return {
			error: 'Ese correo ya tiene una cuenta registrada. Por ahora solo se admiten usuarios nuevos por invitación.',
		}
	}

	const roleAndStores = await validateRoleAndStores(
		access.membership.organizationId,
		normalizedInput.roleId,
		normalizedInput.storeAccessMode,
		normalizedInput.storeIds,
	)
	if ('error' in roleAndStores) {
		return {
			error: roleAndStores.error ?? 'El rol seleccionado no es válido.',
		}
	}

	const rawToken = createInvitationToken()
	const expiresAt = new Date()
	expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRATION_DAYS)

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(organizationInvitations)
				.set({
					revokedAt: new Date(),
					revokedBy: access.session.user.id,
				})
				.where(
					and(
						eq(
							organizationInvitations.organizationId,
							access.membership.organizationId,
						),
						eq(
							organizationInvitations.email,
							normalizedInput.email,
						),
						isNull(organizationInvitations.acceptedAt),
						isNull(organizationInvitations.revokedAt),
					),
				)

			const [invitation] = await tx
				.insert(organizationInvitations)
				.values({
					organizationId: access.membership.organizationId,
					roleId: roleAndStores.role.id,
					email: normalizedInput.email,
					tokenHash: hashInvitationToken(rawToken),
					storeAccessMode: normalizedInput.storeAccessMode,
					expiresAt,
					createdBy: access.session.user.id,
				})
				.returning({ id: organizationInvitations.id })

			if (
				normalizedInput.storeAccessMode === 'selected' &&
				roleAndStores.validStoreIds.length > 0
			) {
				await tx.insert(organizationInvitationStores).values(
					roleAndStores.validStoreIds.map((storeId) => ({
						invitationId: invitation.id,
						storeId,
					})),
				)
			}

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.USER_INVITED,
					entityType: 'invitation',
					entityId: invitation.id,
					newData: {
						email: normalizedInput.email,
						roleId: normalizedInput.roleId,
						storeAccessMode: normalizedInput.storeAccessMode,
						storeIds: roleAndStores.validStoreIds,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo crear la invitación. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/users')
	return {
		success: true,
		inviteUrl: `${INVITATION_PATH_PREFIX}/${rawToken}`,
		token: rawToken,
	}
}

export async function $getUserAccessAction(
	userId: string,
): Promise<UserAccessActionResult | { error: string }> {
	const access = await requireUsersAccess('users.view')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const member = await getUserByIdForOrganization(
		userId,
		access.membership.organizationId,
	)
	if (!member) return { error: 'El usuario no fue encontrado.' }

	return {
		userId: member.userId,
		email: member.email,
		name: member.name,
		roleId: member.roleId,
		storeAccessMode: member.storeAccessMode as StoreAccessMode,
		storeIds: member.storeIds,
	}
}

export async function $updateUserAccessAction(
	input: UpdateUserAccessInput,
): Promise<UserActionResult> {
	const access = await requireUsersAccess('users.manage')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const normalizedInput = normalizeUpdateUserAccessInput(input)
	const validationError = validateUpdateUserAccessInput(normalizedInput)
	if (validationError) return { error: validationError }

	if (normalizedInput.userId === access.session.user.id) {
		return {
			error: 'No puedes editar tu propio acceso desde este módulo.',
		}
	}

	const member = await getUserByIdForOrganization(
		normalizedInput.userId,
		access.membership.organizationId,
	)
	if (!member) return { error: 'El usuario no fue encontrado.' }

	const roleAndStores = await validateRoleAndStores(
		access.membership.organizationId,
		normalizedInput.roleId,
		normalizedInput.storeAccessMode,
		normalizedInput.storeIds,
	)
	if ('error' in roleAndStores) {
		return {
			error: roleAndStores.error ?? 'El rol seleccionado no es válido.',
		}
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(organizationMembers)
				.set({
					role: roleAndStores.role.slug,
					roleId: roleAndStores.role.id,
					storeAccessMode: normalizedInput.storeAccessMode,
					updatedAt: new Date(),
					updatedBy: access.session.user.id,
				})
				.where(
					and(
						eq(organizationMembers.userId, normalizedInput.userId),
						eq(
							organizationMembers.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await tx
				.delete(organizationMemberStores)
				.where(
					and(
						eq(
							organizationMemberStores.userId,
							normalizedInput.userId,
						),
						eq(
							organizationMemberStores.organizationId,
							access.membership.organizationId,
						),
					),
				)

			if (
				normalizedInput.storeAccessMode === 'selected' &&
				roleAndStores.validStoreIds.length > 0
			) {
				await tx.insert(organizationMemberStores).values(
					roleAndStores.validStoreIds.map((storeId) => ({
						userId: normalizedInput.userId,
						organizationId: access.membership.organizationId,
						storeId,
						createdBy: access.session.user.id,
					})),
				)
			}

			await syncMemberPermissions(
				normalizedInput.userId,
				access.membership.organizationId,
				normalizedInput.permissionIds,
				tx,
			)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.USER_ACCESS_UPDATED,
					entityType: 'user',
					entityId: normalizedInput.userId,
					oldData: {
						roleId: member.roleId,
						storeAccessMode: member.storeAccessMode,
						storeIds: member.storeIds,
					},
					newData: {
						roleId: normalizedInput.roleId,
						storeAccessMode: normalizedInput.storeAccessMode,
						storeIds: roleAndStores.validStoreIds,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar el acceso del usuario.',
		}
	}

	revalidatePath('/dashboard/users')
	return { success: true }
}

export async function $updateMemberAccessAction(
	userId: string,
	input: Omit<UpdateUserAccessInput, 'userId'>,
): Promise<UserActionResult> {
	return $updateUserAccessAction({
		...input,
		userId,
	})
}

export async function $revokeInvitationAction(
	invitationId: string,
): Promise<UserActionResult> {
	const access = await requireUsersAccess('users.revoke')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	const invitation = await getInvitationByIdForOrganization(
		invitationId,
		access.membership.organizationId,
	)
	if (!invitation) return { error: 'La invitación no fue encontrada.' }
	if (invitation.acceptedAt || invitation.revokedAt) {
		return { error: 'La invitación ya no está activa.' }
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(organizationInvitations)
				.set({
					revokedAt: new Date(),
					revokedBy: access.session.user.id,
				})
				.where(
					and(
						eq(organizationInvitations.id, invitation.id),
						eq(
							organizationInvitations.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.INVITATION_REVOKED,
					entityType: 'invitation',
					entityId: invitation.id,
					oldData: {
						email: invitation.email,
						roleId: invitation.roleId,
					},
				},
				tx,
			)
		})
	} catch {
		return { error: 'No se pudo revocar la invitación.' }
	}

	revalidatePath('/dashboard/users')
	return { success: true }
}

export async function $removeUserFromOrganizationAction(
	userId: string,
): Promise<UserActionResult> {
	const access = await requireUsersAccess('users.revoke')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	if (userId === access.session.user.id) {
		return { error: 'No puedes retirarte a ti mismo de la organización.' }
	}

	const member = await getUserByIdForOrganization(
		userId,
		access.membership.organizationId,
	)
	if (!member) return { error: 'El usuario no fue encontrado.' }

	try {
		await db.transaction(async (tx) => {
			await tx
				.delete(organizationMemberStores)
				.where(
					and(
						eq(organizationMemberStores.userId, userId),
						eq(
							organizationMemberStores.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await tx
				.delete(organizationMembers)
				.where(
					and(
						eq(organizationMembers.userId, userId),
						eq(
							organizationMembers.organizationId,
							access.membership.organizationId,
						),
					),
				)

			await createAuditLog(
				{
					organizationId: access.membership.organizationId,
					userId: access.session.user.id,
					action: AUDIT_LOG.USER_REMOVED,
					entityType: 'user',
					entityId: userId,
					oldData: {
						email: member.email,
						roleId: member.roleId,
						storeAccessMode: member.storeAccessMode,
						storeIds: member.storeIds,
					},
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo retirar al usuario de la organización.',
		}
	}

	revalidatePath('/dashboard/users')
	return { success: true }
}

export async function $acceptInvitationAction(
	input: AcceptInvitationInput,
): Promise<UserActionResult> {
	const normalizedInput = {
		...input,
		confirmPassword: input.confirmPassword ?? input.password,
	}
	const validationError = validateAcceptInvitationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const invitation = await getOpenInvitationByToken(normalizedInput.token)
	if (!invitation) return { error: 'La invitación no fue encontrada.' }
	if (invitation.acceptedAt || invitation.revokedAt) {
		return { error: 'La invitación ya no está disponible.' }
	}
	if (invitation.expiresAt < new Date()) {
		return { error: 'La invitación ha expirado.' }
	}

	const existingUser = await getExistingUserByEmail(invitation.email)
	if (existingUser) {
		return {
			error: 'Ese correo ya tiene una cuenta registrada. Solicita una nueva invitación con otro correo.',
		}
	}

	let createdUserId: string | null = null

	try {
		const authResult = await auth.api.signUpEmail({
			body: {
				name: normalizedInput.name.trim(),
				email: invitation.email,
				password: normalizedInput.password,
			},
		})

		if (!authResult?.user?.id) {
			return { error: 'No se pudo completar el registro.' }
		}

		const userId = authResult.user.id
		createdUserId = userId

		const invitationStores =
			invitation.storeAccessMode === 'selected'
				? await db
						.select({
							storeId: organizationInvitationStores.storeId,
						})
						.from(organizationInvitationStores)
						.where(
							eq(
								organizationInvitationStores.invitationId,
								invitation.id,
							),
						)
				: []

		await db.transaction(async (tx) => {
			await tx.insert(organizationMembers).values({
				userId,
				organizationId: invitation.organizationId,
				role: invitation.roleSlug,
				roleId: invitation.roleId,
				storeAccessMode: invitation.storeAccessMode,
				createdBy: userId,
			})

			if (
				invitation.storeAccessMode === 'selected' &&
				invitationStores.length > 0
			) {
				await tx.insert(organizationMemberStores).values(
					invitationStores.map((store) => ({
						userId,
						organizationId: invitation.organizationId,
						storeId: store.storeId,
						createdBy: userId,
					})),
				)
			}

			await tx
				.update(organizationInvitations)
				.set({
					acceptedAt: new Date(),
					acceptedBy: userId,
				})
				.where(eq(organizationInvitations.id, invitation.id))

			await tx
				.update(users)
				.set({
					setupStatus: 'complete',
				})
				.where(eq(users.id, userId))

			await createAuditLog(
				{
					organizationId: invitation.organizationId,
					userId,
					action: AUDIT_LOG.INVITATION_ACCEPTED,
					entityType: 'invitation',
					entityId: invitation.id,
					newData: {
						email: invitation.email,
						roleId: invitation.roleId,
						userId,
					},
				},
				tx,
			)

			await createAuditLog(
				{
					organizationId: invitation.organizationId,
					userId,
					action: AUDIT_LOG.USER_JOINED_ORGANIZATION,
					entityType: 'organization_member',
					entityId: userId,
					newData: {
						invitationId: invitation.id,
						email: invitation.email,
						roleId: invitation.roleId,
					},
				},
				tx,
			)
		})
	} catch {
		if (createdUserId) {
			const createdUserIdValue = createdUserId
			await db.delete(users).where(eq(users.id, createdUserIdValue))
		}

		return {
			error: 'No se pudo completar el registro. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/users')
	redirect('/dashboard')
}

export interface SendInvitationEmailInput {
	email: string
	inviteUrl: string
}

export async function $sendInvitationEmailAction(
	input: SendInvitationEmailInput,
): Promise<UserActionResult> {
	const access = await requireUsersAccess('users.invite')
	if ('error' in access) {
		return {
			error:
				access.error ?? 'No tienes permisos para realizar esta acción.',
		}
	}

	if (!input.email?.trim() || !input.inviteUrl?.trim()) {
		return { error: 'Datos de invitación inválidos.' }
	}

	const [org] = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, access.membership.organizationId))
		.limit(1)

	const organizationName = org?.name ?? 'tu organización'

	const html = await renderInvitationEmail({
		organizationName,
		inviteUrl: input.inviteUrl,
	})

	const text = [
		`Has sido invitado a unirte a ${organizationName} en Open Reclamos.`,
		'',
		'Acepta tu invitación en el siguiente enlace:',
		input.inviteUrl,
		'',
		'El enlace es válido por 7 días.',
	].join('\n')

	try {
		await sendEmail({
			to: input.email,
			subject: `Invitación para unirte a ${organizationName}`,
			text,
			html,
		})
	} catch {
		return {
			error: 'No se pudo enviar el correo. Verifica la configuración de email.',
		}
	}

	return { success: true }
}
