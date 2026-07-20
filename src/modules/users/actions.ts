'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import {
	organizationInvitationStores,
	organizationInvitations,
	organizationMemberPermissions,
	organizationMemberStores,
	organizationMembers,
	organizations,
	users,
} from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { auth } from '@/lib/auth'
import { getSession } from '@/lib/auth-server'
import { SSO_ENABLED, SSO_PROVIDER_NAME } from '@/lib/config'
import { sendEmail } from '@/lib/email'
import { setActiveOrganizationCookie } from '@/modules/rbac/cookies'
import {
	canAssignRoleLevel,
	canGrantStoreAccess,
	canManageMember,
} from '@/modules/rbac/lib'
import {
	assignDefaultMemberPermissionsForRole,
	canActorGrantRole,
	getAvailablePermissionIdsForOrganization,
	getUngrantablePermissionKeysByIds,
	isSuperAdminUser,
	type MembershipContext,
} from '@/modules/rbac/queries'
import { getRoleByIdForOrganization } from '@/modules/roles/queries'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
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

interface GrantedMemberAccess {
	roleId: string
	storeAccessMode: StoreAccessMode
	storeIds: string[]
}

async function validateRoleAndStores(
	actor: MembershipContext,
	actorIsSuperAdmin: boolean,
	roleId: string,
	storeAccessMode: StoreAccessMode,
	storeIds: string[],
	granted?: GrantedMemberAccess,
) {
	const role = await getRoleByIdForOrganization(roleId, actor.organizationId)
	if (!role) return { error: MESSAGES.users.invalidRole } as const

	const keepsGrantedRole = role.id === granted?.roleId
	if (!keepsGrantedRole) {
		const isRoleLevelAssignable = canAssignRoleLevel({
			actorRoleLevel: actor.roleLevel,
			roleLevel: role.level,
			actorIsSuperAdmin,
		})
		if (!isRoleLevelAssignable) {
			return { error: MESSAGES.users.roleLevelAboveActor } as const
		}

		if (!(await canActorGrantRole(actor.permissionKeys, role.id))) {
			return { error: MESSAGES.users.roleBeyondActorPermissions } as const
		}
	}

	const isStoreAccessGrantable = canGrantStoreAccess({
		actorAccess: {
			storeAccessMode: actor.storeAccessMode,
			storeIds: actor.storeIds,
		},
		requestedAccess: { storeAccessMode, storeIds },
		alreadyGrantedAccess: granted && {
			storeAccessMode: granted.storeAccessMode,
			storeIds: granted.storeIds,
		},
	})
	if (!isStoreAccessGrantable) {
		return { error: MESSAGES.users.storeAccessBeyondActor } as const
	}

	const validStoreIds =
		storeAccessMode === 'selected'
			? await getValidStoreIdsForOrganization(
					actor.organizationId,
					storeIds,
				)
			: []

	if (
		storeAccessMode === 'selected' &&
		validStoreIds.length !== storeIds.length
	) {
		return {
			error: MESSAGES.users.invalidStores,
		} as const
	}

	return { role, validStoreIds } as const
}

export async function $getUsersTableAction(
	input: GetUsersTableActionInput,
): Promise<GetUsersTableActionResult> {
	const access = await requireAccess('users.view')
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
	const access = await requireAccess('users.view')
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
	const access = await requireAccess('users.invite')
	if ('error' in access) {
		return {
			error: access.error,
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
		return { error: MESSAGES.users.emailAlreadyMember }
	}

	// Con SSO la cuenta vive en el IdP: un usuario existente puede aceptar
	// la invitación iniciando sesión. Sin SSO solo se admiten usuarios nuevos.
	if (!SSO_ENABLED) {
		const existingUser = await getExistingUserByEmail(normalizedInput.email)
		if (existingUser) {
			return {
				error: MESSAGES.users.emailHasAccountInviteOnly,
			}
		}
	}

	const actorIsSuperAdmin = await isSuperAdminUser(access.session.user.id)
	const roleAndStores = await validateRoleAndStores(
		access.membership,
		actorIsSuperAdmin,
		normalizedInput.roleId,
		normalizedInput.storeAccessMode,
		normalizedInput.storeIds,
	)
	if ('error' in roleAndStores) {
		return {
			error: roleAndStores.error ?? MESSAGES.users.invalidRole,
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

			await createAuditLog({
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
			})
		})
	} catch {
		return {
			error: MESSAGES.users.invitationCreateFailed,
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
	const access = await requireAccess('users.view')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const member = await getUserByIdForOrganization(
		userId,
		access.membership.organizationId,
	)
	if (!member) return { error: MESSAGES.users.notFound }

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
	const access = await requireAccess('users.manage')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const normalizedInput = normalizeUpdateUserAccessInput(input)
	const validationError = validateUpdateUserAccessInput(normalizedInput)
	if (validationError) return { error: validationError }

	if (normalizedInput.userId === access.session.user.id) {
		return {
			error: MESSAGES.users.cannotEditOwnAccess,
		}
	}

	const member = await getUserByIdForOrganization(
		normalizedInput.userId,
		access.membership.organizationId,
	)
	if (!member) return { error: MESSAGES.users.notFound }

	if (member.isSuperAdmin) {
		return { error: MESSAGES.users.cannotEditSuperAdmin }
	}

	const actorIsSuperAdmin = await isSuperAdminUser(access.session.user.id)
	const isMemberManageable = canManageMember({
		actorRoleLevel: access.membership.roleLevel,
		targetRoleLevel: member.roleLevel,
		targetIsSuperAdmin: member.isSuperAdmin,
		actorIsSuperAdmin,
	})
	if (!isMemberManageable) {
		return { error: MESSAGES.users.cannotManageHigherLevelUser }
	}

	const roleAndStores = await validateRoleAndStores(
		access.membership,
		actorIsSuperAdmin,
		normalizedInput.roleId,
		normalizedInput.storeAccessMode,
		normalizedInput.storeIds,
		{
			roleId: member.roleId,
			storeAccessMode: member.storeAccessMode,
			storeIds: member.storeIds,
		},
	)
	if ('error' in roleAndStores) {
		return {
			error: roleAndStores.error ?? MESSAGES.users.invalidRole,
		}
	}

	const availablePermissionIds =
		await getAvailablePermissionIdsForOrganization(
			access.membership.organizationId,
		)
	const invalidPermissionId = normalizedInput.permissionIds.find(
		(permissionId) => !availablePermissionIds.has(permissionId),
	)
	if (invalidPermissionId) {
		return { error: MESSAGES.permissions.invalidSelection }
	}

	const ungrantableKeys = await getUngrantablePermissionKeysByIds({
		actorPermissionKeys: access.membership.permissionKeys,
		requestedPermissionIds: normalizedInput.permissionIds,
		alreadyGrantedPermissionIds: member.permissionIds,
	})
	if (ungrantableKeys.length > 0) {
		return { error: MESSAGES.permissions.beyondActor }
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

			await createAuditLog({
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
			})
		})
	} catch {
		return {
			error: MESSAGES.users.accessUpdateFailed,
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
	const access = await requireAccess('users.revoke')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	const invitation = await getInvitationByIdForOrganization(
		invitationId,
		access.membership.organizationId,
	)
	if (!invitation) return { error: MESSAGES.users.invitationNotFound }
	if (invitation.acceptedAt || invitation.revokedAt) {
		return { error: MESSAGES.users.invitationNotActive }
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

			await createAuditLog({
				organizationId: access.membership.organizationId,
				userId: access.session.user.id,
				action: AUDIT_LOG.INVITATION_REVOKED,
				entityType: 'invitation',
				entityId: invitation.id,
				oldData: {
					email: invitation.email,
					roleId: invitation.roleId,
				},
			})
		})
	} catch {
		return { error: MESSAGES.users.invitationRevokeFailed }
	}

	revalidatePath('/dashboard/users')
	return { success: true }
}

export async function $removeUserFromOrganizationAction(
	userId: string,
): Promise<UserActionResult> {
	const access = await requireAccess('users.revoke')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	if (userId === access.session.user.id) {
		return { error: MESSAGES.users.cannotRemoveSelf }
	}

	const member = await getUserByIdForOrganization(
		userId,
		access.membership.organizationId,
	)
	if (!member) return { error: MESSAGES.users.notFound }

	if (member.isSuperAdmin) {
		return { error: MESSAGES.users.cannotEditSuperAdmin }
	}

	const isMemberManageable = canManageMember({
		actorRoleLevel: access.membership.roleLevel,
		targetRoleLevel: member.roleLevel,
		targetIsSuperAdmin: member.isSuperAdmin,
		actorIsSuperAdmin: await isSuperAdminUser(access.session.user.id),
	})
	if (!isMemberManageable) {
		return { error: MESSAGES.users.cannotManageHigherLevelUser }
	}

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
				.delete(organizationMemberPermissions)
				.where(
					and(
						eq(organizationMemberPermissions.userId, userId),
						eq(
							organizationMemberPermissions.organizationId,
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

			await createAuditLog({
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
			})
		})
	} catch {
		return {
			error: MESSAGES.users.memberRemoveFailed,
		}
	}

	revalidatePath('/dashboard/users')
	return { success: true }
}

export async function $acceptInvitationAction(
	input: AcceptInvitationInput,
): Promise<UserActionResult> {
	if (SSO_ENABLED) {
		return {
			error: MESSAGES.users.passwordSignupDisabled,
		}
	}

	const normalizedInput = {
		...input,
		confirmPassword: input.confirmPassword ?? input.password,
	}
	const validationError = validateAcceptInvitationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const invitation = await getOpenInvitationByToken(normalizedInput.token)
	if (!invitation) return { error: MESSAGES.users.invitationNotFound }
	if (invitation.acceptedAt || invitation.revokedAt) {
		return { error: MESSAGES.users.invitationUnavailable }
	}
	if (invitation.expiresAt < new Date()) {
		return { error: MESSAGES.users.invitationExpired }
	}

	const existingUser = await getExistingUserByEmail(invitation.email)
	if (existingUser) {
		return {
			error: MESSAGES.users.emailHasAccountNewInvitation,
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
			return { error: MESSAGES.users.registrationFailed }
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

			await assignDefaultMemberPermissionsForRole(
				{
					userId,
					organizationId: invitation.organizationId,
					roleKey: invitation.roleKey,
					createdBy: userId,
				},
				tx,
			)

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

			await createAuditLog({
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
			})

			await createAuditLog({
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
			})
		})
	} catch {
		if (createdUserId) {
			const createdUserIdValue = createdUserId
			await db.delete(users).where(eq(users.id, createdUserIdValue))
		}

		return {
			error: MESSAGES.users.registrationFailedRetry,
		}
	}

	revalidatePath('/dashboard/users')
	await setActiveOrganizationCookie(invitation.organizationId)
	redirect('/dashboard')
}

export async function $acceptSsoInvitationAction(
	token: string,
): Promise<UserActionResult> {
	if (!SSO_ENABLED) return { error: MESSAGES.users.ssoDisabled }

	const session = await getSession()
	if (!session) redirect('/login')

	const invitation = await getOpenInvitationByToken(token.trim())
	if (!invitation) return { error: MESSAGES.users.invitationNotFound }
	if (invitation.acceptedAt || invitation.revokedAt) {
		return { error: MESSAGES.users.invitationUnavailable }
	}
	if (invitation.expiresAt < new Date()) {
		return { error: MESSAGES.users.invitationExpired }
	}
	if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		return {
			error: `Debes acceder con la cuenta ${invitation.email}.`,
		}
	}

	const existingMembership = await getUserMembershipByEmail(
		invitation.email,
		invitation.organizationId,
	)
	if (existingMembership) {
		return { error: MESSAGES.users.alreadyMember }
	}

	const invitationStores =
		invitation.storeAccessMode === 'selected'
			? await db
					.select({ storeId: organizationInvitationStores.storeId })
					.from(organizationInvitationStores)
					.where(
						eq(
							organizationInvitationStores.invitationId,
							invitation.id,
						),
					)
			: []

	try {
		await db.transaction(async (tx) => {
			await tx.insert(organizationMembers).values({
				userId: session.user.id,
				organizationId: invitation.organizationId,
				role: invitation.roleSlug,
				roleId: invitation.roleId,
				storeAccessMode: invitation.storeAccessMode,
				createdBy: session.user.id,
			})

			await assignDefaultMemberPermissionsForRole(
				{
					userId: session.user.id,
					organizationId: invitation.organizationId,
					roleKey: invitation.roleKey,
					createdBy: session.user.id,
				},
				tx,
			)

			if (
				invitation.storeAccessMode === 'selected' &&
				invitationStores.length > 0
			) {
				await tx.insert(organizationMemberStores).values(
					invitationStores.map((store) => ({
						userId: session.user.id,
						organizationId: invitation.organizationId,
						storeId: store.storeId,
						createdBy: session.user.id,
					})),
				)
			}

			await tx
				.update(organizationInvitations)
				.set({ acceptedAt: new Date(), acceptedBy: session.user.id })
				.where(
					and(
						eq(organizationInvitations.id, invitation.id),
						isNull(organizationInvitations.acceptedAt),
						isNull(organizationInvitations.revokedAt),
					),
				)

			await tx
				.update(users)
				.set({ setupStatus: 'complete' })
				.where(eq(users.id, session.user.id))
		})
	} catch {
		return {
			error: MESSAGES.users.invitationAcceptFailed,
		}
	}

	await Promise.all([
		createAuditLog({
			organizationId: invitation.organizationId,
			userId: session.user.id,
			action: AUDIT_LOG.INVITATION_ACCEPTED,
			entityType: 'invitation',
			entityId: invitation.id,
			newData: {
				email: invitation.email,
				roleId: invitation.roleId,
				userId: session.user.id,
				method: 'oidc',
			},
		}),
		createAuditLog({
			organizationId: invitation.organizationId,
			userId: session.user.id,
			action: AUDIT_LOG.USER_JOINED_ORGANIZATION,
			entityType: 'organization_member',
			entityId: session.user.id,
			newData: {
				invitationId: invitation.id,
				email: invitation.email,
				roleId: invitation.roleId,
			},
		}),
	])

	revalidatePath('/dashboard/users')
	await setActiveOrganizationCookie(invitation.organizationId)
	redirect('/dashboard')
}

export interface SendInvitationEmailInput {
	email: string
	inviteUrl: string
}

export async function $sendInvitationEmailAction(
	input: SendInvitationEmailInput,
): Promise<UserActionResult> {
	const access = await requireAccess('users.invite')
	if ('error' in access) {
		return {
			error: access.error,
		}
	}

	if (!input.email?.trim() || !input.inviteUrl?.trim()) {
		return { error: MESSAGES.users.invalidInvitationData }
	}

	const [org] = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, access.membership.organizationId))
		.limit(1)

	const organizationName = org?.name ?? 'tu organización'
	const accessMode = SSO_ENABLED ? 'sso' : 'credentials'

	const html = await renderInvitationEmail({
		organizationName,
		inviteUrl: input.inviteUrl,
		accessMode,
		providerName: SSO_ENABLED ? SSO_PROVIDER_NAME : undefined,
	})

	const text = [
		`Has sido invitado a unirte a ${organizationName} en Open Reclamos.`,
		'',
		accessMode === 'sso'
			? `Inicia sesión con ${SSO_PROVIDER_NAME} y acepta tu invitación en el siguiente enlace:`
			: 'Acepta tu invitación en el siguiente enlace:',
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
			error: MESSAGES.users.emailSendFailed,
		}
	}

	return { success: true }
}
