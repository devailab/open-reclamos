package settings

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Get devuelve la configuración de la empresa activa.
func (f *Feature) Get(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	settings, err := f.deps.Repo.GetSettings(ctx, p.OrganizationID)

	return operation.Record(settings), err
}
