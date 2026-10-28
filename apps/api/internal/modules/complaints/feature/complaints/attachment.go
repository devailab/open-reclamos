package complaints

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// AttachmentURL devuelve la URL autenticada de descarga de un adjunto.
func (f *Feature) AttachmentURL(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidAttachment)
	}

	a, err := f.deps.Repo.GetAttachment(
		ctx,
		repository.GetAttachmentParams{ID: in.ID, OrganizationID: p.OrganizationID},
	)
	if err != nil {
		return operation.Output{}, err
	}

	if !p.CanStore(a.StoreID) {
		return operation.Output{}, apperrors.Denied()
	}

	return operation.Record(map[string]string{"url": f.deps.Config.PublicBaseURL + constants.PathFiles + a.ID}), nil
}
