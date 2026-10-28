package stores

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// SetFormEnabled activa o desactiva el formulario público de una tienda.
func (f *Feature) SetFormEnabled(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if err := validateScope(p.CanStore(in.ID), in.ID); err != nil {
		return operation.Output{}, err
	}

	err := apperrors.Changed(
		f.deps.Repo.SetStoreFormEnabled(
			ctx,
			repository.SetStoreFormEnabledParams{
				ID:             in.ID,
				OrganizationID: p.OrganizationID,
				FormEnabled:    utils.Bool(in.Data, "form_enabled"),
				UpdatedBy:      &p.UserID,
			},
		),
	)

	return operation.Success(), err
}
