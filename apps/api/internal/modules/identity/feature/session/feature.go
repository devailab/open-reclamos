// Package session inicia, renueva y cierra sesiones locales.
package session

import "openreclamos.com/api/internal/shared/deps"

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }

// publicUser es la forma del usuario devuelta al iniciar sesión.
func publicUser(id, name, lastName, email string) map[string]any {
	return map[string]any{"id": id, "name": name, "last_name": lastName, "email": email}
}
