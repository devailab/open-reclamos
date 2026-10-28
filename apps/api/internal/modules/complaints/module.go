// Package complaints agrupa el libro público, la atención de reclamos, documentos y exportaciones.
package complaints

import (
	"net/http"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/modules/complaints/feature/auditlog"
	"openreclamos.com/api/internal/modules/complaints/feature/complaints"
	"openreclamos.com/api/internal/modules/complaints/feature/dashboard"
	"openreclamos.com/api/internal/modules/complaints/feature/documents"
	"openreclamos.com/api/internal/modules/complaints/feature/exports"
	"openreclamos.com/api/internal/modules/complaints/feature/notices"
	"openreclamos.com/api/internal/modules/complaints/feature/public"
	"openreclamos.com/api/internal/modules/complaints/feature/review"
	"openreclamos.com/api/internal/modules/complaints/handler"
	"openreclamos.com/api/internal/modules/complaints/rpc"
	"openreclamos.com/api/internal/shared/deps"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/server"
)

type Module struct {
	deps       *deps.Deps
	Public     *public.Feature
	Complaints *complaints.Feature
	Review     *review.Feature
	Dashboard  *dashboard.Feature
	AuditLog   *auditlog.Feature
	Notices    *notices.Feature
	Documents  *documents.Feature
	Exports    *exports.Feature
	Handler    *handler.Handler
}

func New(d *deps.Deps) *Module {
	documentsFeature := documents.New(d)
	exportsFeature := exports.New(d, documentsFeature)

	return &Module{
		deps:       d,
		Public:     public.New(d),
		Complaints: complaints.New(d),
		Review:     review.New(d),
		Dashboard:  dashboard.New(d),
		AuditLog:   auditlog.New(d),
		Notices:    notices.New(d),
		Documents:  documentsFeature,
		Exports:    exportsFeature,
		Handler:    handler.New(d, exportsFeature),
	}
}

// RegisterRPC publica las operaciones del módulo.
func (m *Module) RegisterRPC(r *operation.Registry) {
	rpc.Register(r, m.Public, m.Complaints, m.Review, m.Dashboard, m.AuditLog, m.Notices, m.Documents, m.Exports)
}

// RegisterHTTP publica uploads y descargas.
func (m *Module) RegisterHTTP(mux *http.ServeMux) {
	db := m.deps.DB

	mux.HandleFunc("POST /api/complaints/upload", server.RequireDatabase(db, m.Handler.Upload))
	mux.HandleFunc("DELETE /api/complaints/upload", server.RequireDatabase(db, m.Handler.DeleteUpload))
	mux.HandleFunc("GET /api/files/{id}", server.RequireDatabase(db, m.Handler.DownloadAttachment))
	mux.HandleFunc("GET /api/exports/{id}", server.RequireDatabase(db, m.Handler.DownloadExport))
}

// RegisterWorkers agrega los workers del módulo.
func (m *Module) RegisterWorkers(workers *river.Workers) {
	river.AddWorker(workers, &exports.Worker{Feature: m.Exports})
}
