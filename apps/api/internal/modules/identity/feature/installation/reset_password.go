package installation

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// ResetPassword recupera una cuenta; solo es accesible desde la consola del operador.
func (f *Feature) ResetPassword(ctx context.Context, email, password string) error {
	if !utils.ValidPassword(password) {
		return apperrors.Invalid(constants.MsgRecoveryPasswordLength)
	}

	user, err := f.deps.Repo.GetUserByEmail(ctx, strings.ToLower(email))
	if err != nil {
		return err
	}

	encoded, err := auth.HashPassword(password)
	if err != nil {
		return err
	}

	return f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if user.Password == nil {
			err = q.CreateCredential(
				ctx,
				repository.CreateCredentialParams{
					ID:        utils.NewID(),
					UserID:    user.ID,
					AccountID: user.ID,
					Password:  &encoded,
				},
			)
		} else {
			_, err = q.UpdatePassword(ctx, repository.UpdatePasswordParams{UserID: user.ID, Password: &encoded})
		}

		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			auth.Principal{UserID: user.ID},
			constants.AuditPasswordRecovered,
			constants.EntityUser,
			user.ID,
			nil,
			nil,
		)
	})
}
