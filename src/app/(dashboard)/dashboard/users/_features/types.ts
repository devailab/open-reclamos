import type { StoreAccessGrant } from '@/modules/rbac/lib'
import type {
	PermissionOption,
	RoleOptionWithPermissions,
	StoreOption,
} from '@/modules/rbac/queries'
import type { InvitationTableRow, UserTableRow } from '@/modules/users/queries'
import type { UsersTableFilters } from '@/modules/users/validation'

export type UserRow = UserTableRow
export type InvitationRow = InvitationTableRow

export interface UsersInitialState {
	users: UserRow[]
	usersTotalItems: number
	userFilters: UsersTableFilters
	invitations: InvitationRow[]
	invitationsTotalItems: number
	invitationFilters: UsersTableFilters
	roleOptions: RoleOptionWithPermissions[]
	permissionOptions: PermissionOption[]
	storeOptions: StoreOption[]
	actorPermissionKeys: string[]
	actorStoreAccess: StoreAccessGrant
	actorRoleLevel: number
	actorIsSuperAdmin: boolean
}

export interface UsersPageProps {
	initialState: UsersInitialState
}
