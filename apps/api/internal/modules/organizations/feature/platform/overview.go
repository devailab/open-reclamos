package platform

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Overview devuelve métricas globales de la instalación.
func (f *Feature) Overview(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	if err := auth.MustPlatformAdmin(p); err != nil {
		return operation.Output{}, err
	}

	data, err := f.deps.Repo.PlatformOverview(ctx)

	return operation.Record(data), err
}
