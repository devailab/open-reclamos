package utils

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// Load busca un reclamo dentro de la empresa y tiendas del principal; lock lo bloquea para escribir.
func Load(
	ctx context.Context,
	q *repository.Repository,
	p auth.Principal,
	id string,
	lock bool,
) (models.Complaint, error) {
	if !utils.ValidID(id) {
		return models.Complaint{}, apperrors.Invalid(constants.MsgInvalidComplaint)
	}

	params := repository.GetComplaintParams{
		ID:             id,
		OrganizationID: p.OrganizationID,
		AllStores:      p.AllStores,
		StoreIds:       p.StoreIDs,
	}

	if lock {
		return q.LockComplaint(ctx, params)
	}

	return q.GetComplaint(ctx, params)
}
