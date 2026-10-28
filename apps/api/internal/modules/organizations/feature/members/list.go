package members

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve los miembros de la empresa activa.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	users, err := f.deps.Repo.ListUsers(ctx, p.OrganizationID)

	return operation.Rows(users, in), err
}

// ListRoles devuelve los roles fijos.
func (f *Feature) ListRoles(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	roles, err := f.deps.Repo.ListRoles(ctx)

	return operation.Rows(roles, in), err
}
