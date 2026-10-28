package email

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/mailer"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Test envía un correo de prueba y explica el paso SMTP que falló.
func (f *Feature) Test(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	recipient := utils.Text(in.Data, "email")
	if !utils.ValidEmail(recipient) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidEmail)
	}

	if !f.deps.Mailer.Enabled() {
		return operation.Status(constants.DeliverySkipped), nil
	}

	if err := f.deps.Mailer.Send(ctx, recipient, constants.MailTestSubject, constants.MailTestBody, nil); err != nil {
		return operation.Output{}, mailer.DescribeTestFailure(err)
	}

	return operation.Status(constants.DeliverySent), nil
}
