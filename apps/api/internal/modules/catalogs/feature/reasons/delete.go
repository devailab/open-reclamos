package reasons

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

// Delete elimina un motivo.
func (f *Feature) Delete(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidReason)
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if _, err := q.LockOrganization(ctx, p.OrganizationID); err != nil {
			return err
		}

		if err := apperrors.Changed(q.DeleteReason(ctx, repository.DeleteReasonParams{ID: in.ID, OrganizationID: p.OrganizationID, DeletedBy: &p.UserID})); err != nil {
			return err
		}

		return audit.Record(ctx, q, p, constants.AuditReasonDeleted, constants.EntityReason, in.ID, nil, nil)
	})

	return operation.Success(), err
}
