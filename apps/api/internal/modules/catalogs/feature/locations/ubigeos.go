package locations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// ListUbigeos busca distritos por código exacto o por texto.
func (f *Feature) ListUbigeos(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	if code := utils.Text(in.Filters, "ubigeo_code"); code != "" {
		ubigeos, err := f.deps.Repo.FindUbigeosByCode(ctx, code)

		return operation.Rows(ubigeos, in), err
	}

	ubigeos, err := f.deps.Repo.SearchUbigeos(ctx, utils.Text(in.Filters, "search"))

	return operation.Rows(ubigeos, in), err
}
