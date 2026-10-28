package sso

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// ListConnections devuelve las conexiones SSO de la empresa activa.
func (f *Feature) ListConnections(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	connections, err := f.deps.Repo.ListSSOConnections(ctx, p.OrganizationID)

	return operation.Rows(connections, in), err
}

// Settings devuelve la política SSO de la empresa activa.
func (f *Feature) Settings(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	settings, err := f.deps.Repo.GetSSOSettings(ctx, p.OrganizationID)

	return operation.Record(settings), err
}
