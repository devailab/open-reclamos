// Package exports exporta el libro filtrado; los volúmenes grandes se generan en segundo plano.
package exports

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
