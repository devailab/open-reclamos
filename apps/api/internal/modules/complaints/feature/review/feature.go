// Package review cubre la atención de un reclamo: revisión, borrador, clasificación y respuesta.
package review

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
