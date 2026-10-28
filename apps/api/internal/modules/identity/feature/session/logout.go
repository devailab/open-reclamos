package session

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Logout expira las cookies de sesión.
func (f *Feature) Logout(_ context.Context, _ auth.Principal, _ operation.Input) (operation.Output, error) {
	out := operation.Success()
	out.Header = f.deps.Auth.LogoutHeaders()

	return out, nil
}
