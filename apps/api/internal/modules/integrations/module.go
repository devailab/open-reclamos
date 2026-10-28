// Package integrations agrupa webhooks, correo, consulta documental, API REST pública y MCP.
package integrations

import (
	"net/http"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/modules/complaints/feature/complaints"
	"openreclamos.com/api/internal/modules/complaints/feature/documents"
	"openreclamos.com/api/internal/modules/integrations/feature/email"
	"openreclamos.com/api/internal/modules/integrations/feature/lookup"
	"openreclamos.com/api/internal/modules/integrations/feature/webhooks"
	"openreclamos.com/api/internal/modules/integrations/handler"
	"openreclamos.com/api/internal/modules/integrations/rpc"
	"openreclamos.com/api/internal/shared/deps"
	"openreclamos.com/api/internal/shared/operation"
)

type Module struct {
	deps       *deps.Deps
	complaints *complaints.Feature
	Webhooks   *webhooks.Feature
	Email      *email.Feature
	Lookup     *lookup.Feature
}

// New recibe las features de reclamos que necesitan el correo (PDF) y MCP (búsqueda por código).
func New(d *deps.Deps, complaints *complaints.Feature, documents *documents.Feature) *Module {
	return &Module{
		deps:       d,
		complaints: complaints,
		Webhooks:   webhooks.New(d),
		Email:      email.New(d, documents),
		Lookup:     lookup.New(d),
	}
}

// RegisterRPC publica las operaciones del módulo.
func (m *Module) RegisterRPC(r *operation.Registry) {
	rpc.Register(r, m.Webhooks, m.Email, m.Lookup)
}

// RegisterHTTP publica la API REST pública y MCP sobre el registro de operaciones.
func (m *Module) RegisterHTTP(mux *http.ServeMux, registry *operation.Registry) {
	handler.RegisterPublicAPI(mux, registry)
	mux.Handle("/mcp", handler.NewMCP(m.deps, registry, m.complaints))
}

// RegisterWorkers agrega los workers del módulo.
func (m *Module) RegisterWorkers(workers *river.Workers) {
	river.AddWorker(workers, &webhooks.Worker{Feature: m.Webhooks})
	river.AddWorker(workers, &email.Worker{Feature: m.Email})
}
