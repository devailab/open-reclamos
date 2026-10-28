package organizations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Switch cambia la empresa activa de la sesión y emite tokens nuevos.
func (f *Feature) Switch(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	tenant, err := f.deps.Auth.Tenant(ctx, p, in.ID)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Session(
		f.deps.Auth,
		f.deps.Auth.ContextClaims(tenant),
		map[string]string{"organization_id": tenant.OrganizationID, "role": tenant.Role},
	)
}
