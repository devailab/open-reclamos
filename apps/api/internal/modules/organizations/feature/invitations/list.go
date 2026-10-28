package invitations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve las invitaciones de la empresa activa.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	invitations, err := f.deps.Repo.ListInvitations(ctx, p.OrganizationID)

	return operation.Rows(invitations, in), err
}
