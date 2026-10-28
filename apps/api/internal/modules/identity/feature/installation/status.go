package installation

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Status indica si ya hay usuarios y si el registro público está activo.
func (f *Feature) Status(ctx context.Context, _ auth.Principal, _ operation.Input) (operation.Output, error) {
	count, err := f.deps.Repo.CountUsers(ctx)

	return operation.Record(
		map[string]any{"installed": count > 0, "public_registration": f.deps.Config.AllowPublicRegistration},
	), err
}
