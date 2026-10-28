package categories

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve las categorías de la empresa.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	categories, err := f.deps.Repo.ListCategories(ctx, p.OrganizationID)

	return operation.Rows(categories, in), err
}
