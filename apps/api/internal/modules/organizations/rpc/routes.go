// Package rpc conecta las operaciones RPC del módulo de organizaciones con sus features.
package rpc

import (
	"openreclamos.com/api/internal/modules/organizations/feature/invitations"
	"openreclamos.com/api/internal/modules/organizations/feature/members"
	"openreclamos.com/api/internal/modules/organizations/feature/organizations"
	"openreclamos.com/api/internal/modules/organizations/feature/platform"
	"openreclamos.com/api/internal/modules/organizations/feature/settings"
	. "openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

func Register(
	r *operation.Registry,
	organizations *organizations.Feature,
	settings *settings.Feature,
	members *members.Feature,
	invitations *invitations.Feature,
	platform *platform.Feature,
) {
	r.Global(OpListOrganizations, organizations.List)
	r.Global(OpSwitchOrganization, organizations.Switch)
	r.Global(OpCreateOrganization, organizations.Create)
	r.Global(OpCompleteSetup, organizations.CompleteSetup)
	r.Global(OpSuggestOrganizationSlug, organizations.SuggestSlug)
	r.Tenant(OpGetOrganization, PermissionRead, organizations.Get)
	r.Tenant(OpUpdateOrganization, PermissionAdmin, organizations.Update)

	r.Tenant(OpGetSettings, PermissionRead, settings.Get)
	r.Tenant(OpUpdateSettings, PermissionAdmin, settings.Update)
	r.Tenant(OpRemoveLogo, PermissionAdmin, settings.RemoveLogo)

	r.Tenant(OpListUsers, PermissionAdmin, members.List)
	r.Tenant(OpListRoles, PermissionRead, members.ListRoles)
	r.Tenant(OpGetUserAccess, PermissionAdmin, members.GetAccess)
	r.Tenant(OpUpdateUserAccess, PermissionAdmin, members.UpdateAccess)
	r.Tenant(OpRemoveUser, PermissionAdmin, members.Remove)

	r.Public(OpGetInvitation, invitations.Get)
	r.Public(OpAcceptInvitation, invitations.Accept)
	r.Tenant(OpListInvitations, PermissionAdmin, invitations.List)
	r.Tenant(OpCreateInvitation, PermissionAdmin, invitations.Create)
	r.Tenant(OpRevokeInvitation, PermissionAdmin, invitations.Revoke)
	r.Tenant(OpSendInvitationEmail, PermissionAdmin, invitations.SendEmail)

	r.Global(OpGetPlatformOverview, platform.Overview)
	r.Global(OpListPlatformOrganizations, platform.ListOrganizations)
	r.Global(OpSetOrganizationStatus, platform.SetOrganizationStatus)
}
