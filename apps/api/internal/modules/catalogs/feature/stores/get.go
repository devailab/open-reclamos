package stores

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Get devuelve una tienda autorizada.
func (f *Feature) Get(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) || !p.CanStore(in.ID) {
		return operation.Output{}, apperrors.Denied()
	}

	store, err := f.deps.Repo.GetStore(ctx, repository.GetStoreParams{ID: in.ID, OrganizationID: p.OrganizationID})

	return operation.Record(store), err
}
