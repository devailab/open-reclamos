package platform

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// ListOrganizations devuelve todas las empresas de la instalación.
func (f *Feature) ListOrganizations(
	ctx context.Context,
	p auth.Principal,
	in operation.Input,
) (operation.Output, error) {
	if err := auth.MustPlatformAdmin(p); err != nil {
		return operation.Output{}, err
	}

	organizations, err := f.deps.Repo.ListPlatformOrganizations(ctx)

	return operation.Rows(organizations, in), err
}
