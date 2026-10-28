// Package installation crea el primer administrador y recupera cuentas desde la consola.
package installation

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
