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

// Remove quita a un miembro de la empresa.
func (f *Feature) Remove(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidUser)
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := protectLastAdmin(ctx, q, p, in.ID, ""); err != nil {
			return err
		}

		if err := apperrors.Changed(q.DeleteMember(ctx, repository.DeleteMemberParams{OrganizationID: p.OrganizationID, UserID: in.ID})); err != nil {
			return err
		}

		return audit.Record(ctx, q, p, constants.AuditMemberRemoved, constants.EntityUser, in.ID, nil, nil)
	})

	return operation.Success(), err
}
