// Package email prueba la configuración SMTP y envía los correos de los reclamos.
package email

import (
	"openreclamos.com/api/internal/modules/complaints/feature/documents"
	"openreclamos.com/api/internal/shared/deps"
)

type Feature struct {
	deps      *deps.Deps
	documents *documents.Feature
}

func New(d *deps.Deps, documents *documents.Feature) *Feature {
	return &Feature{deps: d, documents: documents}
}
