// Package identity agrupa instalación, sesiones, perfil, claves API y SSO.
package identity

import (
	"net/http"

	"openreclamos.com/api/internal/modules/identity/feature/apikeys"
	"openreclamos.com/api/internal/modules/identity/feature/installation"
	"openreclamos.com/api/internal/modules/identity/feature/profile"
	"openreclamos.com/api/internal/modules/identity/feature/session"
	"openreclamos.com/api/internal/modules/identity/feature/sso"
	"openreclamos.com/api/internal/modules/identity/handler"
	"openreclamos.com/api/internal/modules/identity/rpc"
	"openreclamos.com/api/internal/shared/deps"
	"openreclamos.com/api/internal/shared/operation"
)

type Module struct {
	Installation *installation.Feature
	Session      *session.Feature
	Profile      *profile.Feature
	APIKeys      *apikeys.Feature
	SSO          *sso.Feature
	SSOHandler   *handler.SSO
}

func New(d *deps.Deps) *Module {
	ssoFeature := sso.New(d)

	return &Module{
		Installation: installation.New(d),
		Session:      session.New(d),
		Profile:      profile.New(d),
		APIKeys:      apikeys.New(d),
		SSO:          ssoFeature,
		SSOHandler:   handler.NewSSO(d, ssoFeature),
	}
}

// RegisterRPC publica las operaciones del módulo.
func (m *Module) RegisterRPC(r *operation.Registry) {
	rpc.Register(r, m.Installation, m.Session, m.Profile, m.APIKeys, m.SSO)
}

// RegisterHTTP publica las rutas SSO del navegador.
func (m *Module) RegisterHTTP(mux *http.ServeMux) {
	for pattern, action := range handler.Routes() {
		mux.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
			r.SetPathValue("action", action)
			m.SSOHandler.Serve(w, r)
		})
	}
}
