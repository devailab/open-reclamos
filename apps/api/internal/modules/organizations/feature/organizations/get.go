package organizations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Get devuelve la empresa activa.
func (f *Feature) Get(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	organization, err := f.deps.Repo.GetOrganization(ctx, p.OrganizationID)

	return operation.Record(organization), err
}
