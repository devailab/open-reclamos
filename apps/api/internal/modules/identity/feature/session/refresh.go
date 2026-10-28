package session

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// Refresh emite un access token nuevo a partir de la cookie de refresh.
func (f *Feature) Refresh(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	claims, err := f.deps.Auth.Parse(in.RefreshToken, constants.TokenRefresh)
	if err != nil {
		return operation.Output{}, err
	}

	u, err := f.deps.Repo.GetUser(ctx, claims.Subject)
	if err != nil || !u.Active {
		return operation.Output{}, apperrors.Unauthorized()
	}

	// El contexto firmado conserva la empresa y el plazo original del login.
	return operation.Session(f.deps.Auth, claims, map[string]bool{"success": true})
}
