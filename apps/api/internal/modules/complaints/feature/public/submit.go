package public

import (
	"context"
	"time"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// maxFiles es el máximo de adjuntos por reclamo.
const maxFiles = 5

// Submit registra un reclamo desde el formulario público, reclama sus uploads y encola avisos.
func (f *Feature) Submit(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	d := in.Data

	if err := validate(d); err != nil {
		return operation.Output{}, err
	}

	if err := f.deps.Captcha.Verify(ctx, utils.Text(d, "turnstile_token")); err != nil {
		return operation.Output{}, err
	}

	uploads, _ := d["files"].([]any)
	if len(uploads) > maxFiles {
		return operation.Output{}, apperrors.Invalid(constants.MsgTooManyFiles)
	}

	tracking, err := complaintutils.GenerateTrackingCode()
	if err != nil {
		return operation.Output{}, err
	}

	id := utils.NewID()
	var correlative string
	var deadline time.Time

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		store, settings, err := f.openStore(ctx, q, d)
		if err != nil {
			return err
		}

		n, err := q.NextCorrelative(ctx, repository.NextCorrelativeParams{ID: utils.NewID(), StoreID: store.ID})
		if err != nil {
			return err
		}

		correlative = complaintutils.FormatCorrelative(n)
		deadline = time.Now().AddDate(0, 0, int(settings.ResponseDeadlineDays))
		complaint := newComplaint(d)
		complaint.ID, complaint.OrganizationID, complaint.StoreID = id, store.OrganizationID, store.ID
		complaint.TrackingCode, complaint.Correlative = tracking, correlative
		complaint.ResponseDeadlineDays, complaint.ResponseDeadline = settings.ResponseDeadlineDays, deadline

		if err = q.CreateComplaint(ctx, &complaint); err != nil {
			return err
		}

		if err = attachUploads(ctx, q, store, id, uploads); err != nil {
			return err
		}

		return f.notifySubmitted(ctx, q, store.OrganizationID, id, tracking)
	})

	return operation.Record(
		map[string]any{"tracking_code": tracking, "correlative": correlative, "response_deadline": deadline},
	), err
}

// openStore resuelve la tienda del formulario y exige que el formulario esté habilitado.
func (f *Feature) openStore(
	ctx context.Context,
	q *repository.Repository,
	d map[string]any,
) (repository.PublicStore, models.OrganizationSetting, error) {
	store, err := q.GetPublicStore(ctx, utils.Text(d, "store_slug"))
	if err != nil {
		return store, models.OrganizationSetting{}, err
	}

	if slug := utils.Text(d, "organization_slug"); slug != "" && slug != store.OrganizationSlug {
		return store, models.OrganizationSetting{}, apperrors.Invalid(constants.MsgStoreNotInOrganization)
	}

	settings, err := q.GetSettings(ctx, store.OrganizationID)
	if err != nil {
		return store, settings, err
	}

	if !settings.FormEnabled || !store.FormEnabled {
		return store, settings, apperrors.Conflict(constants.MsgFormUnavailable)
	}

	if reason := utils.Text(d, "reason_id"); reason != "" {
		if _, err = q.GetReason(ctx, repository.GetReasonParams{ID: reason, OrganizationID: store.OrganizationID}); err != nil {
			return store, settings, err
		}
	}

	return store, settings, nil
}

// attachUploads reclama cada upload temporal (id + token) como adjunto del reclamo.
func attachUploads(
	ctx context.Context,
	q *repository.Repository,
	store repository.PublicStore,
	complaintID string,
	uploads []any,
) error {
	for _, item := range uploads {
		file, ok := item.(map[string]any)
		if !ok || !utils.ValidID(utils.Text(file, "id")) {
			return apperrors.Invalid(constants.MsgInvalidFile)
		}

		upload, err := q.ClaimUpload(
			ctx,
			repository.ClaimUploadParams{
				ID:             utils.Text(file, "id"),
				OrganizationID: store.OrganizationID,
				StoreID:        store.ID,
				TokenHash:      utils.Hash(utils.Text(file, "token")),
			},
		)
		if err != nil {
			return err
		}

		if err = q.AddAttachment(ctx, repository.AddAttachmentParams{ID: utils.NewID(), ComplaintID: complaintID, StorageKey: upload.StorageKey, FileName: upload.FileName, ContentType: &upload.ContentType}); err != nil {
			return err
		}
	}

	return nil
}

// notifySubmitted registra historial y auditoría y encola correos y webhooks.
func (f *Feature) notifySubmitted(
	ctx context.Context,
	q *repository.Repository,
	organizationID, id, tracking string,
) error {
	p := auth.Principal{OrganizationID: organizationID, Role: constants.RoleConsumer}

	if err := complaintutils.AddHistory(ctx, q, p, id, constants.HistoryEventCreated, "", constants.ComplaintOpen, constants.HistoryComplaintCreated); err != nil {
		return err
	}

	if err := audit.Record(ctx, q, p, constants.AuditComplaintCreated, constants.EntityComplaint, id, nil, map[string]string{"tracking_code": tracking}); err != nil {
		return err
	}

	status := constants.DeliverySkipped

	if f.deps.Mailer.Enabled() {
		status = constants.DeliveryQueued
	}

	if err := q.UpsertDeliveries(ctx, repository.UpsertDeliveriesParams{ID: utils.NewID(), OrganizationID: organizationID, ComplaintID: id, ReceiptDeliveryStatus: &status}); err != nil {
		return err
	}

	if err := f.deps.Jobs.EnqueueEmail(ctx, q, organizationID, id, constants.EmailReceipt); err != nil {
		return err
	}

	if err := f.deps.Jobs.EnqueueEmail(ctx, q, organizationID, id, constants.EmailAdmin); err != nil {
		return err
	}

	return f.deps.Jobs.EnqueueEvent(
		ctx,
		q,
		organizationID,
		id,
		constants.EventComplaintSubmitted,
		map[string]string{"tracking_code": tracking, "status": constants.ComplaintOpen},
	)
}
