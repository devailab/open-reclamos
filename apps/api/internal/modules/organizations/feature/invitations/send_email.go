package invitations

import (
	"context"
	"time"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// SendEmail reenvía una invitación: con in.ID rota el token; sin él usa data.token.
func (f *Feature) SendEmail(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if in.ID != "" {
		return f.resend(ctx, p, in.ID)
	}

	raw := utils.Text(in.Data, "token")
	i, err := f.valid(ctx, raw)
	if err != nil || i.OrganizationID != p.OrganizationID {
		return operation.Output{}, apperrors.Denied()
	}

	if !f.deps.Mailer.Enabled() {
		return operation.Record(map[string]string{"status": constants.DeliverySkipped, "url": f.link(raw)}), nil
	}

	err = f.deps.Mailer.Send(
		ctx,
		i.Email,
		constants.MsgInvitationSubject+i.OrganizationName,
		constants.MsgInvitationBody+f.link(raw),
		nil,
	)

	return operation.Status(constants.DeliverySent), err
}

// resend genera un token nuevo para una invitación pendiente y lo envía si hay SMTP.
func (f *Feature) resend(ctx context.Context, p auth.Principal, id string) (operation.Output, error) {
	if !utils.ValidID(id) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidInvitation)
	}

	invitation, err := f.deps.Repo.GetPendingInvitation(
		ctx,
		repository.GetPendingInvitationParams{ID: id, OrganizationID: p.OrganizationID},
	)
	if err != nil {
		return operation.Output{}, err
	}

	raw := utils.Token()

	if err = apperrors.Changed(f.deps.Repo.RotateInvitation(ctx, repository.RotateInvitationParams{ID: id, OrganizationID: p.OrganizationID, TokenHash: utils.Hash(raw), ExpiresAt: time.Now().Add(lifetime)})); err != nil {
		return operation.Output{}, err
	}

	link := f.link(raw)
	status := constants.DeliverySkipped

	if f.deps.Mailer.Enabled() {
		status = constants.DeliverySent

		if f.deps.Mailer.Send(
			ctx,
			invitation.Email,
			constants.MsgInvitationSubject+invitation.OrganizationName,
			constants.MsgInvitationBody+link,
			nil,
		) != nil {
			status = constants.DeliveryFailed
		}
	}

	return operation.Record(map[string]string{"status": status, "url": link}), nil
}
