package profile

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// cambia el nombre del usuario de la sesión.
func (f *Feature) Update(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	name := utils.Text(in.Data, "name")
	lastName := utils.Text(in.Data, "last_name")
	if !utils.Required(name, 120) || !utils.Required(lastName, 120) {
		return operation.Output{}, apperrors.Invalid(constants.MsgNameRequired)
	}

	u, err := f.deps.Repo.UpdateProfile(
		ctx,
		repository.UpdateProfileParams{ID: p.UserID, Name: name, LastName: lastName},
	)

	return operation.Record(u), err
}
