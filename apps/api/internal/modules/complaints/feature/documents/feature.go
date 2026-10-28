// Package documents genera constancias, respuestas y el libro de reclamaciones.
package documents

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
