package apikeys

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Create genera una clave; el valor solo se devuelve en esta respuesta.
func (f *Feature) Create(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if p.AuthMethod == constants.AuthAPI {
		return operation.Output{}, apperrors.Denied()
	}

	name := utils.Text(in.Data, "name")
	if !utils.Required(name, 120) {
		return operation.Output{}, apperrors.Invalid(constants.MsgAPIKeyNameRequired)
	}

	raw := utils.Token()
	id := utils.NewID()

	err := f.deps.Repo.CreateAPIKey(
		ctx,
		repository.CreateAPIKeyParams{
			ID:             id,
			UserID:         p.UserID,
			OrganizationID: p.OrganizationID,
			TokenHash:      utils.Hash(raw),
			Name:           name,
		},
	)

	return operation.Record(map[string]string{"id": id, "api_key": raw}), err
}
