package session

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Login valida email y contraseña y abre una sesión local.
func (f *Feature) Login(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	u, err := f.deps.Repo.GetUserByEmail(ctx, strings.ToLower(utils.Text(in.Data, "email")))
	password := utils.RawText(in.Data, "password")
	if err != nil || !u.Active || u.Password == nil || !auth.CheckPassword(utils.Value(u.Password), password) {
		return operation.Output{}, apperrors.Unauthorized()
	}

	// La contraseña es correcta pero el email no se confirmó: reenviar el código.
	if !u.EmailVerified && f.verificationRequired() {
		return f.pendingVerification(ctx, u.ID, u.Email)
	}

	_, raw, err := f.deps.Auth.NewContext(u.ID, constants.AuthLocal)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Login(f.deps.Auth, raw, publicUser(u.ID, u.Name, u.LastName, u.Email))
}
