// Package app es la raíz de composición: crea dependencias, módulos, rutas y workers.
package app

import (
	"context"
	"net/http"

	"github.com/riverqueue/river"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/modules/catalogs"
	"openreclamos.com/api/internal/modules/complaints"
	"openreclamos.com/api/internal/modules/identity"
	"openreclamos.com/api/internal/modules/identity/feature/installation"
	"openreclamos.com/api/internal/modules/integrations"
	"openreclamos.com/api/internal/modules/organizations"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/deps"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/operation"
)

type App struct {
	*deps.Deps
	Registry      *operation.Registry
	Identity      *identity.Module
	Organizations *organizations.Module
	Catalogs      *catalogs.Module
	Complaints    *complaints.Module
	Integrations  *integrations.Module
}

// New construye la aplicación; db puede ser nil (las operaciones responden "no disponible").
func New(db *gorm.DB, cfg config.Config) *App {
	d := deps.New(db, cfg)
	complaintsModule := complaints.New(d)

	a := &App{
		Deps:          d,
		Registry:      operation.NewRegistry(d.Auth, db != nil),
		Identity:      identity.New(d),
		Organizations: organizations.New(d),
		Catalogs:      catalogs.New(d),
		Complaints:    complaintsModule,
		Integrations:  integrations.New(d, complaintsModule.Complaints, complaintsModule.Documents),
	}

	a.Identity.RegisterRPC(a.Registry)
	a.Organizations.RegisterRPC(a.Registry)
	a.Catalogs.RegisterRPC(a.Registry)
	a.Complaints.RegisterRPC(a.Registry)
	a.Integrations.RegisterRPC(a.Registry)

	return a
}

// Call ejecuta una operación RPC por nombre (útil para pruebas y adaptadores).
func (a *App) Call(
	ctx context.Context,
	method string,
	in operation.Input,
	header http.Header,
) (operation.Output, error) {
	return a.Registry.Call(ctx, method, in, header)
}

// StartWorkers crea el cliente River con los workers de todos los módulos.
func (a *App) StartWorkers(ctx context.Context) error {
	workers := river.NewWorkers()

	river.AddWorker(workers, &jobs.CleanupWorker{Repo: a.Repo, Storage: a.Storage})
	river.AddWorker(workers, &jobs.DeleteObjectWorker{Storage: a.Storage})
	a.Complaints.RegisterWorkers(workers)
	a.Integrations.RegisterWorkers(workers)

	return a.Jobs.Start(ctx, a.DB, workers)
}

// Bootstrap crea el primer administrador (comando bootstrap).
func (a *App) Bootstrap(ctx context.Context, admin installation.Admin) error {
	return a.Identity.Installation.Bootstrap(ctx, admin)
}

// ResetPassword recupera una cuenta (comando reset-password).
func (a *App) ResetPassword(ctx context.Context, email, password string) error {
	return a.Identity.Installation.ResetPassword(ctx, email, password)
}

// RecoverSSO devuelve una empresa a acceso local (comando recover-sso).
func (a *App) RecoverSSO(ctx context.Context, organizationID string) error {
	return a.Identity.SSO.Recover(ctx, organizationID)
}
