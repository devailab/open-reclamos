package members

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// UpdateAccess cambia rol y tiendas de un miembro.
func (f *Feature) UpdateAccess(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidUser)
	}

	if err := ValidateAccess(in.Data); err != nil {
		return operation.Output{}, err
	}

	if err := CanGrantStores(p, in.Data); err != nil {
		return operation.Output{}, err
	}

	role, mode := utils.Text(in.Data, "role"), utils.Text(in.Data, "store_access_mode")

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := protectLastAdmin(ctx, q, p, in.ID, role); err != nil {
			return err
		}

		if err := apperrors.Changed(q.UpdateMember(ctx, repository.UpdateMemberParams{OrganizationID: p.OrganizationID, UserID: in.ID, Role: role, StoreAccessMode: mode, UpdatedBy: &p.UserID})); err != nil {
			return err
		}

		if err := q.ClearMemberStores(ctx, repository.ClearMemberStoresParams{OrganizationID: p.OrganizationID, UserID: in.ID}); err != nil {
			return err
		}

		if mode == constants.StoreAccessSelected {
			for _, id := range utils.StringList(in.Data, "store_ids") {
				if _, err := q.GetStore(ctx, repository.GetStoreParams{ID: id, OrganizationID: p.OrganizationID}); err != nil {
					return err
				}

				if err := q.AssignStore(ctx, repository.AssignStoreParams{UserID: in.ID, OrganizationID: p.OrganizationID, StoreID: id, CreatedBy: &p.UserID}); err != nil {
					return err
				}
			}
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditMemberUpdated,
			constants.EntityUser,
			in.ID,
			nil,
			map[string]string{"role": role},
		)
	})

	return operation.Success(), err
}
