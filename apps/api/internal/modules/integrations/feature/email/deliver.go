package email

import (
	"context"
	"slices"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/mailer"
	"openreclamos.com/api/internal/shared/utils"
)

// Worker envía los correos encolados de reclamos.
type Worker struct {
	river.WorkerDefaults[jobs.EmailArgs]
	Feature *Feature
}

func (w *Worker) Work(ctx context.Context, j *river.Job[jobs.EmailArgs]) error {
	return w.Feature.Deliver(ctx, j.Args)
}

// Deliver envía el aviso a administradores o el PDF (constancia/respuesta) al consumidor.
func (f *Feature) Deliver(ctx context.Context, args jobs.EmailArgs) error {
	c, err := f.deps.Repo.GetComplaint(
		ctx,
		repository.GetComplaintParams{ID: args.ComplaintID, OrganizationID: args.OrganizationID, AllStores: true},
	)
	if err != nil {
		return err
	}

	if args.Workflow == constants.EmailAdmin {
		return f.notifyAdmins(ctx, args.OrganizationID, c)
	}

	delivery, err := f.deps.Repo.GetDeliveries(
		ctx,
		repository.GetDeliveriesParams{OrganizationID: args.OrganizationID, ComplaintID: c.ID},
	)
	if err != nil {
		return err
	}

	if (args.Workflow == constants.EmailReceipt && utils.Value(delivery.ReceiptDeliveryStatus) == constants.DeliverySent) ||
		(args.Workflow == constants.EmailResponse && utils.Value(delivery.ResponseDeliveryStatus) == constants.DeliverySent) {
		return nil
	}

	document, err := f.documents.StoredPDF(ctx, c, args.Workflow == constants.EmailResponse)
	if err != nil {
		return err
	}

	err = f.deps.Mailer.Send(
		ctx,
		c.Email,
		constants.MailComplaintSubject+c.Correlative,
		constants.MailComplaintBody+c.TrackingCode,
		&mailer.Attachment{Name: "documento.pdf", Data: document},
	)

	status, message := constants.DeliverySent, ""

	if err != nil {
		status, message = constants.DeliveryFailed, constants.MsgEmailSendFailed
	}

	if updateErr := f.deps.Repo.SetEmailDelivery(ctx, repository.SetEmailDeliveryParams{ComplaintID: c.ID, OrganizationID: args.OrganizationID, Workflow: args.Workflow, Status: status, ErrorMessage: message}); updateErr != nil {
		return updateErr
	}

	return err
}

// notifyAdmins avisa a los administradores activos que ven la tienda del reclamo.
func (f *Feature) notifyAdmins(ctx context.Context, organizationID string, c models.Complaint) error {
	members, err := f.deps.Repo.ListUsers(ctx, organizationID)
	if err != nil {
		return err
	}

	for _, u := range members {
		if u.Role != constants.RoleAdmin || !u.Active {
			continue
		}

		member, err := f.deps.Repo.GetMembership(
			ctx,
			repository.GetMembershipParams{UserID: u.ID, OrganizationID: organizationID},
		)
		if err != nil {
			return err
		}

		if member.StoreAccessMode == constants.StoreAccessSelected {
			stores, err := f.deps.Repo.GetAssignedStores(
				ctx,
				repository.GetAssignedStoresParams{UserID: u.ID, OrganizationID: organizationID},
			)
			if err != nil {
				return err
			}

			if !slices.Contains(stores, c.StoreID) {
				continue
			}
		}

		if err = f.deps.Mailer.Send(ctx, u.Email, constants.MailNewComplaintSubject+c.Correlative, constants.MailNewComplaintBody, nil); err != nil {
			return err
		}
	}

	return nil
}
