// Package lookup consulta RUC/DNI en el proveedor documental configurado.
package lookup

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
