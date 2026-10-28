// Package catalogs agrupa tiendas, motivos, categorías y ubicaciones.
package catalogs

import (
	"openreclamos.com/api/internal/modules/catalogs/feature/categories"
	"openreclamos.com/api/internal/modules/catalogs/feature/locations"
	"openreclamos.com/api/internal/modules/catalogs/feature/reasons"
	"openreclamos.com/api/internal/modules/catalogs/feature/stores"
	"openreclamos.com/api/internal/modules/catalogs/rpc"
	"openreclamos.com/api/internal/shared/deps"
	"openreclamos.com/api/internal/shared/operation"
)

type Module struct {
	Locations  *locations.Feature
	Stores     *stores.Feature
	Reasons    *reasons.Feature
	Categories *categories.Feature
}

func New(d *deps.Deps) *Module {
	return &Module{
		Locations:  locations.New(d),
		Stores:     stores.New(d),
		Reasons:    reasons.New(d),
		Categories: categories.New(d),
	}
}

// RegisterRPC publica las operaciones del módulo.
func (m *Module) RegisterRPC(r *operation.Registry) {
	rpc.Register(r, m.Locations, m.Stores, m.Reasons, m.Categories)
}
