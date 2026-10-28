package organizations

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// CompleteSetup crea la primera empresa con su tienda inicial desde el asistente.
func (f *Feature) CompleteSetup(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	organization, ok := in.Data["organization"].(map[string]any)
	store, storeOK := in.Data["store"].(map[string]any)
	if !ok || !storeOK {
		return operation.Output{}, apperrors.Invalid(constants.MsgOrganizationAndStoreRequired)
	}

	organization["initial_store"] = store

	return f.Create(ctx, p, operation.Input{Data: organization})
}
