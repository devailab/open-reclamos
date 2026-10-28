package complaints

import (
	"context"
	"net/http"
	"strings"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// LookupByTracking autoriza la petición y devuelve el detalle del reclamo por código (lo usa MCP).
func (f *Feature) LookupByTracking(ctx context.Context, header http.Header, code string) (operation.Output, error) {
	p, err := f.deps.Auth.Authorize(ctx, header, constants.PermissionRead)
	if err != nil {
		return operation.Output{}, err
	}

	id, err := f.deps.Repo.GetScopedTrackingID(
		ctx,
		repository.GetScopedTrackingIDParams{
			OrganizationID: p.OrganizationID,
			TrackingCode:   strings.ToUpper(strings.TrimSpace(code)),
			AllStores:      p.AllStores,
			StoreIds:       p.StoreIDs,
		},
	)
	if err != nil {
		return operation.Output{}, apperrors.Translate(err)
	}

	out, err := f.Get(ctx, p, operation.Input{ID: id})

	return out, apperrors.Translate(err)
}
