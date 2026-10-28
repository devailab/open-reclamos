package members

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// GetAccess devuelve rol y tiendas de un miembro.
func (f *Feature) GetAccess(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidUser)
	}

	member, err := f.deps.Repo.GetMembership(
		ctx,
		repository.GetMembershipParams{UserID: in.ID, OrganizationID: p.OrganizationID},
	)
	if err != nil {
		return operation.Output{}, err
	}

	stores, err := f.deps.Repo.GetAssignedStores(
		ctx,
		repository.GetAssignedStoresParams{UserID: in.ID, OrganizationID: p.OrganizationID},
	)

	return operation.Record(
		map[string]any{"role": member.Role, "store_access_mode": member.StoreAccessMode, "store_ids": stores},
	), err
}
