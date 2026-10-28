package review

import (
	"context"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// maxResponseLength limita borradores y respuestas oficiales.
const maxResponseLength = 10000

// SaveDraft guarda un borrador interno de respuesta.
func (f *Feature) SaveDraft(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	draft := utils.Text(in.Data, "draft_response")
	if len([]rune(draft)) > maxResponseLength {
		return operation.Output{}, apperrors.Invalid(constants.MsgResponseTooLong)
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		c, err := complaintutils.Load(ctx, q, p, in.ID, true)
		if err != nil {
			return err
		}

		if c.Status == constants.ComplaintResolved {
			return apperrors.Conflict(constants.MsgAlreadyAnswered)
		}

		return q.SaveDraft(
			ctx,
			repository.SaveDraftParams{
				ID:             utils.NewID(),
				OrganizationID: p.OrganizationID,
				ComplaintID:    c.ID,
				DraftResponse:  utils.Ptr(draft),
				DraftSavedBy:   &p.UserID,
			},
		)
	})

	return operation.Success(), err
}
