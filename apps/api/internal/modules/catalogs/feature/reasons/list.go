package reasons

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve los motivos de la empresa.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	reasons, err := f.deps.Repo.ListReasons(ctx, p.OrganizationID)

	return operation.Rows(reasons, in), err
}
