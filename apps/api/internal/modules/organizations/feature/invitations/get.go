package invitations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// Get muestra los datos públicos de una invitación (in.ID es el token).
func (f *Feature) Get(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	i, err := f.valid(ctx, in.ID)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Record(
		map[string]any{
			"id":                i.ID,
			"organization_name": i.OrganizationName,
			"email":             i.Email,
			"role":              i.Role,
			"expires_at":        i.ExpiresAt,
		},
	), nil
}
