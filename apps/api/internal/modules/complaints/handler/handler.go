// Package handler expone las rutas HTTP (no RPC) del módulo de reclamos: archivos y exportaciones.
package handler

import (
	"openreclamos.com/api/internal/modules/complaints/feature/exports"
	"openreclamos.com/api/internal/shared/deps"
)

type Handler struct {
	deps    *deps.Deps
	exports *exports.Feature
}

func New(d *deps.Deps, exports *exports.Feature) *Handler { return &Handler{deps: d, exports: exports} }
