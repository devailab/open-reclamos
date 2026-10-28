package organizations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve las empresas del usuario.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	organizations, err := f.deps.Repo.ListOrganizations(ctx, p.UserID)

	return operation.Rows(organizations, in), err
}
