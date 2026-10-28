// Package apikeys gestiona las claves API personales por empresa.
package apikeys

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
