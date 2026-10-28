package session

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

// Get devuelve el usuario de la sesión y, si hay empresa activa, su rol y tiendas.
func (f *Feature) Get(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	data := map[string]any{
		"user": map[string]any{
			"id":                p.UserID,
			"name":              p.Session.Name,
			"last_name":         p.Session.LastName,
			"email":             p.Session.Email,
			"is_platform_admin": p.IsPlatform,
		},
		"organization_id": p.OrganizationID,
		"auth_method":     p.AuthMethod,
	}

	if p.OrganizationID != "" {
		if tenant, err := f.deps.Auth.Tenant(ctx, p, p.OrganizationID); err == nil {
			data["role"] = tenant.Role
			data["capabilities"] = constants.Capabilities(tenant.Role)
			data["all_stores"] = tenant.AllStores
			data["store_ids"] = tenant.StoreIDs
		}
	}

	return operation.Record(data), nil
}
