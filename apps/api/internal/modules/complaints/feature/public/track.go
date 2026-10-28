package public

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Track devuelve el estado público y el historial de un reclamo por código de seguimiento.
func (f *Feature) Track(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	o, err := f.deps.Repo.GetPublicOrganization(ctx, utils.Text(in.Data, "organization_slug"))
	if err != nil {
		return operation.Output{}, err
	}

	c, err := f.deps.Repo.GetPublicTracking(
		ctx,
		repository.GetPublicTrackingParams{
			Slug:         o.Slug,
			TrackingCode: strings.ToUpper(utils.Text(in.Data, "tracking_code")),
		},
	)
	if err != nil {
		return operation.Output{}, err
	}

	h, err := f.deps.Repo.ListPublicHistory(ctx, repository.ListHistoryParams{OrganizationID: o.ID, ID: c.ID})

	return operation.Record(map[string]any{"complaint": c, "history": h}), err
}
