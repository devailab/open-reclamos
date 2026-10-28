// Package deps agrupa las dependencias compartidas que reciben todos los módulos.
package deps

import (
	"context"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/captcha"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/httpclient"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/mailer"
	"openreclamos.com/api/internal/shared/storage"
)

type Deps struct {
	DB      *gorm.DB
	Repo    *repository.Repository
	Config  config.Config
	Auth    *auth.Service
	Jobs    *jobs.Queue
	Storage *storage.Storage
	Mailer  *mailer.Mailer
	HTTP    *httpclient.Clients
	Captcha *captcha.Verifier
}

// New construye las dependencias; db puede ser nil en pruebas sin base de datos.
// Los servicios compartidos apuntan a d.Config: hay una sola configuración.
func New(db *gorm.DB, cfg config.Config) *Deps {
	repo := repository.New(db)
	clients := httpclient.New(cfg.SSOAllowedHosts)
	d := &Deps{DB: db, Repo: repo, Config: cfg, HTTP: clients}
	d.Auth = auth.NewService(repo, &d.Config)
	d.Jobs = &jobs.Queue{Config: &d.Config}
	d.Storage = &storage.Storage{Config: &d.Config}
	d.Mailer = &mailer.Mailer{Config: &d.Config}
	d.Captcha = &captcha.Verifier{Config: &d.Config, HTTP: clients}

	return d
}

// Transaction comparte una transacción entre escrituras, auditoría, historial y jobs.
func (d *Deps) Transaction(ctx context.Context, fn func(*repository.Repository) error) error {
	return d.Repo.Transaction(ctx, fn)
}
