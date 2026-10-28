// Package rpc conecta las operaciones RPC del módulo de identidad con sus features.
package rpc

import (
	"openreclamos.com/api/internal/modules/identity/feature/apikeys"
	"openreclamos.com/api/internal/modules/identity/feature/installation"
	"openreclamos.com/api/internal/modules/identity/feature/profile"
	"openreclamos.com/api/internal/modules/identity/feature/session"
	"openreclamos.com/api/internal/modules/identity/feature/sso"
	. "openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

func Register(
	r *operation.Registry,
	installation *installation.Feature,
	session *session.Feature,
	profile *profile.Feature,
	apikeys *apikeys.Feature,
	sso *sso.Feature,
) {
	r.Public(OpGetInstallationStatus, installation.Status)
	r.Public(OpInstall, installation.Install)

	r.Public(OpRegister, session.Register)
	r.Public(OpLogin, session.Login)
	r.Public(OpVerifyEmail, session.VerifyEmail)
	r.Public(OpRefreshToken, session.Refresh)
	r.Public(OpLogout, session.Logout)
	r.Global(OpGetSession, session.Get)

	r.Global(OpUpdateProfile, profile.Update)
	r.Global(OpChangePassword, profile.ChangePassword)

	r.Tenant(OpListAPIKeys, PermissionRead, apikeys.List)
	r.Tenant(OpCreateAPIKey, PermissionRead, apikeys.Create)
	r.Tenant(OpRevokeAPIKey, PermissionRead, apikeys.Revoke)

	r.Public(OpGetLoginOptions, sso.LoginOptions)
	r.Tenant(OpListSSOConnections, PermissionAdmin, sso.ListConnections)
	r.Tenant(OpGetSSOSettings, PermissionAdmin, sso.Settings)
	r.Tenant(OpSaveSSOConnection, PermissionAdmin, sso.SaveConnection)
	r.Tenant(OpUpdateSSOPolicy, PermissionAdmin, sso.UpdatePolicy)
	r.Tenant(OpGetSSOMetadata, PermissionAdmin, sso.Metadata)
}
