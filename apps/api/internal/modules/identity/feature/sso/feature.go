// Package sso configura conexiones OIDC/SAML por empresa y completa sus logins.
package sso

import (
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/deps"
)

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }

// url arma la URL pública de una acción SSO de la conexión.
func (f *Feature) url(connectionID, action string) string {
	return constants.SSOURL(f.deps.Config.PublicBaseURL, connectionID, action)
}
