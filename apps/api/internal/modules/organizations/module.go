// Package organizations agrupa empresas, configuración, miembros, invitaciones y plataforma.
package organizations

import (
	"net/http"

	"openreclamos.com/api/internal/modules/organizations/feature/invitations"
	"openreclamos.com/api/internal/modules/organizations/feature/members"
	"openreclamos.com/api/internal/modules/organizations/feature/organizations"
	"openreclamos.com/api/internal/modules/organizations/feature/platform"
	"openreclamos.com/api/internal/modules/organizations/feature/settings"
	"openreclamos.com/api/internal/modules/organizations/handler"
	"openreclamos.com/api/internal/modules/organizations/rpc"
	"openreclamos.com/api/internal/shared/deps"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/server"
)

type Module struct {
	deps          *deps.Deps
	Organizations *organizations.Feature
	Settings      *settings.Feature
	Members       *members.Feature
	Invitations   *invitations.Feature
	Platform      *platform.Feature
	Logo          *handler.Logo
}

func New(d *deps.Deps) *Module {
	return &Module{
		deps:          d,
		Organizations: organizations.New(d),
		Settings:      settings.New(d),
		Members:       members.New(d),
		Invitations:   invitations.New(d),
		Platform:      platform.New(d),
		Logo:          handler.NewLogo(d),
	}
}

// RegisterRPC publica las operaciones del módulo.
func (m *Module) RegisterRPC(r *operation.Registry) {
	rpc.Register(r, m.Organizations, m.Settings, m.Members, m.Invitations, m.Platform)
}

// RegisterHTTP publica las rutas HTTP del módulo.
func (m *Module) RegisterHTTP(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/organizations/logo", server.RequireDatabase(m.deps.DB, m.Logo.Upload))
	mux.HandleFunc("GET /api/logos/{slug}", server.RequireDatabase(m.deps.DB, m.Logo.Get))
}
