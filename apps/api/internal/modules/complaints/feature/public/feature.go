// Package public atiende el libro público: consulta, registro y seguimiento de reclamos.
package public

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
