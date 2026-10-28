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

// ChangePassword reemplaza la contraseña tras validar la actual.
func (f *Feature) ChangePassword(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	password := utils.RawText(in.Data, "new_password")
	if !utils.ValidPassword(password) {
		return operation.Output{}, apperrors.Invalid(constants.MsgPasswordLength)
	}

	encoded, err := auth.HashPassword(password)
	if err != nil {
		return operation.Output{}, err
	}

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		old, err := q.LockCredential(ctx, p.UserID)
		if err != nil || !auth.CheckPassword(utils.Value(old), utils.RawText(in.Data, "current_password")) {
			return apperrors.Unauthorized()
		}

		return apperrors.Changed(
			q.UpdatePassword(ctx, repository.UpdatePasswordParams{UserID: p.UserID, Password: &encoded}),
		)
	})

	return operation.Success(), err
}
