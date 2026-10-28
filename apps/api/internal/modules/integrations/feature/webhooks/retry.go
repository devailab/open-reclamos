package webhooks

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// RetryDelivery vuelve a encolar una entrega no enviada.
func (f *Feature) RetryDelivery(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidDelivery)
	}

	d, err := f.deps.Repo.GetWebhookDelivery(
		ctx,
		repository.GetWebhookDeliveryParams{ID: in.ID, OrganizationID: p.OrganizationID},
	)
	if err != nil {
		return operation.Output{}, err
	}

	if d.Status == constants.DeliverySent {
		return operation.Output{}, apperrors.Conflict(constants.MsgDeliveryAlreadySent)
	}

	err = f.deps.Jobs.Insert(ctx, jobs.WebhookArgs{OrganizationID: p.OrganizationID, DeliveryID: in.ID}, nil)

	return operation.Status(constants.DeliveryQueued), err
}
