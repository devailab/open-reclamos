// Package reasons administra los motivos jerárquicos de reclamo.
package reasons

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }
