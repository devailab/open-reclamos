package invitations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Revoke anula una invitación pendiente.
func (f *Feature) Revoke(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidIdentifier)
	}

	err := apperrors.Changed(
		f.deps.Repo.RevokeInvitation(
			ctx,
			repository.RevokeInvitationParams{ID: in.ID, OrganizationID: p.OrganizationID, RevokedBy: &p.UserID},
		),
	)

	return operation.Success(), err
}
