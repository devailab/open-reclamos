package settings

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// RemoveLogo quita el logo de la empresa activa.
func (f *Feature) RemoveLogo(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	err := apperrors.Changed(
		f.deps.Repo.SetLogo(ctx, repository.SetLogoParams{ID: p.OrganizationID, UpdatedBy: &p.UserID}),
	)

	return operation.Success(), err
}
