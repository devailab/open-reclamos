package installation

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Install es independiente del registro público y solo funciona sin usuarios.
func (f *Feature) Install(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	user, raw, err := f.initialAdministrator(
		ctx,
		Admin{
			Name:           utils.Text(in.Data, "name"),
			LastName:       utils.Text(in.Data, "last_name"),
			Email:          utils.Text(in.Data, "email"),
			Password:       utils.RawText(in.Data, "password"),
			DocumentType:   utils.Text(in.Data, "document_type"),
			DocumentNumber: utils.Text(in.Data, "document_number"),
		},
		true,
	)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Login(
		f.deps.Auth,
		raw,
		map[string]any{
			"id":                user.ID,
			"name":              user.Name,
			"last_name":         user.LastName,
			"email":             user.Email,
			"is_platform_admin": true,
		},
	)
}
