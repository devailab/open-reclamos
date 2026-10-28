package review

import (
	"context"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// Start pasa un reclamo abierto a "en revisión"; si ya no está abierto no hace nada.
func (f *Feature) Start(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		c, err := complaintutils.Load(ctx, q, p, in.ID, true)
		if err != nil {
			return err
		}

		if c.Status != constants.ComplaintOpen {
			return nil
		}

		if err := apperrors.Changed(q.UpdateComplaintState(ctx, repository.UpdateComplaintStateParams{ID: c.ID, OrganizationID: p.OrganizationID, Status: constants.ComplaintInReview, UpdatedBy: &p.UserID})); err != nil {
			return err
		}

		if err = complaintutils.AddHistory(ctx, q, p, c.ID, constants.HistoryEventStatusChanged, constants.ComplaintOpen, constants.ComplaintInReview, constants.HistoryInReview); err != nil {
			return err
		}

		if err = audit.Record(ctx, q, p, constants.AuditComplaintStatus, constants.EntityComplaint, c.ID, map[string]string{"status": constants.ComplaintOpen}, map[string]string{"status": constants.ComplaintInReview}); err != nil {
			return err
		}

		return f.deps.Jobs.EnqueueEvent(
			ctx,
			q,
			p.OrganizationID,
			c.ID,
			constants.EventComplaintStatusChanged,
			map[string]string{"status": constants.ComplaintInReview},
		)
	})

	return operation.Success(), err
}
