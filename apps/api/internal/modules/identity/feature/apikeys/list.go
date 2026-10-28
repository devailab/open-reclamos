package apikeys

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve las claves del usuario en la empresa activa.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	keys, err := f.deps.Repo.ListAPIKeys(
		ctx,
		repository.ListAPIKeysParams{UserID: p.UserID, OrganizationID: p.OrganizationID},
	)

	return operation.Rows(keys, in), err
}
