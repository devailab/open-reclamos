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
	"openreclamos.com/api/internal/shared/utils"
)

// Respond registra la respuesta oficial, resuelve el reclamo y encola correo y webhooks.
func (f *Feature) Respond(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	response := utils.Text(in.Data, "response")
	if !utils.Required(response, maxResponseLength) {
		return operation.Output{}, apperrors.Invalid(constants.MsgOfficialResponseRequired)
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		c, err := complaintutils.Load(ctx, q, p, in.ID, true)
		if err != nil {
			return err
		}

		if c.Status == constants.ComplaintResolved {
			return apperrors.Conflict(constants.MsgAlreadyAnsweredOfficial)
		}

		if err = applyClassification(ctx, q, p, in); err != nil {
			return err
		}

		if err = q.SaveOfficialResponse(ctx, repository.SaveOfficialResponseParams{ID: utils.NewID(), OrganizationID: p.OrganizationID, ComplaintID: c.ID, OfficialResponse: &response, RespondedBy: &p.UserID}); err != nil {
			return err
		}

		if err = apperrors.Changed(q.UpdateComplaintState(ctx, repository.UpdateComplaintStateParams{ID: c.ID, OrganizationID: p.OrganizationID, Status: constants.ComplaintResolved, UpdatedBy: &p.UserID})); err != nil {
			return err
		}

		if err = complaintutils.AddHistory(ctx, q, p, c.ID, constants.HistoryEventResponse, c.Status, constants.ComplaintResolved, constants.HistoryResponded); err != nil {
			return err
		}

		if err = audit.Record(ctx, q, p, constants.AuditComplaintResponded, constants.EntityComplaint, c.ID, map[string]string{"status": c.Status}, map[string]string{"status": constants.ComplaintResolved}); err != nil {
			return err
		}

		return f.notifyResponded(ctx, q, p.OrganizationID, c.ID)
	})

	return operation.Success(), err
}

func (f *Feature) notifyResponded(ctx context.Context, q *repository.Repository, organizationID, id string) error {
	status := constants.DeliverySkipped

	if f.deps.Mailer.Enabled() {
		status = constants.DeliveryQueued
	}

	if err := q.UpsertDeliveries(ctx, repository.UpsertDeliveriesParams{ID: utils.NewID(), OrganizationID: organizationID, ComplaintID: id, ResponseDeliveryStatus: &status}); err != nil {
		return err
	}

	if err := f.deps.Jobs.EnqueueEmail(ctx, q, organizationID, id, constants.EmailResponse); err != nil {
		return err
	}

	return f.deps.Jobs.EnqueueEvent(
		ctx,
		q,
		organizationID,
		id,
		constants.EventComplaintResponded,
		map[string]string{"status": constants.ComplaintResolved},
	)
}
