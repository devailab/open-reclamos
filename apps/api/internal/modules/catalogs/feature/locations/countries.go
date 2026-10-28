package locations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// ListCountries devuelve los países sembrados.
func (f *Feature) ListCountries(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	countries, err := f.deps.Repo.ListCountries(ctx)

	return operation.Rows(countries, in), err
}
