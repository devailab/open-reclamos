package webhooks

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Delete elimina (borrado lógico) un webhook.
func (f *Feature) Delete(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidWebhook)
	}

	err := apperrors.Changed(
		f.deps.Repo.DeleteWebhook(
			ctx,
			repository.DeleteWebhookParams{ID: in.ID, OrganizationID: p.OrganizationID, DeletedBy: &p.UserID},
		),
	)

	return operation.Success(), err
}
