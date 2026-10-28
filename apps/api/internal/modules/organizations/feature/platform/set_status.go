package platform

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// SetOrganizationStatus activa o suspende una empresa.
func (f *Feature) SetOrganizationStatus(
	ctx context.Context,
	p auth.Principal,
	in operation.Input,
) (operation.Output, error) {
	if err := f.deps.Auth.ConfirmPlatformAction(ctx, p, utils.RawText(in.Data, "current_password")); err != nil {
		return operation.Output{}, err
	}

	status := utils.Text(in.Data, "status")
	if !utils.ValidID(in.ID) || (status != constants.StatusActive && status != constants.StatusSuspended) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidStatusOrID)
	}

	var out models.Organization

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		var err error

		out, err = q.SetOrganizationStatus(
			ctx,
			repository.SetOrganizationStatusParams{
				ID:               in.ID,
				Status:           status,
				SuspendedBy:      &p.UserID,
				SuspensionReason: utils.Ptr(utils.Text(in.Data, "reason")),
			},
		)
		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			auth.Principal{UserID: p.UserID, OrganizationID: in.ID},
			constants.AuditOrganizationStatus,
			constants.EntityOrganization,
			in.ID,
			nil,
			map[string]string{"status": status},
		)
	})

	return operation.Record(out), err
}
