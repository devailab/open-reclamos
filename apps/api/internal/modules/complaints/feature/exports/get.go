package exports

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Get devuelve el estado de una exportación y su URL de descarga al completarse.
func (f *Feature) Get(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	export, err := f.Authorized(ctx, p, in.ID)
	if err != nil {
		return operation.Output{}, err
	}

	data := map[string]any{"id": export.ID, "status": export.Status, "error": export.ErrorMessage}

	if export.Status == constants.ExportCompleted {
		data["download_url"] = f.deps.Config.PublicBaseURL + constants.PathExports + export.ID
	}

	return operation.Record(data), nil
}

// Authorized devuelve la exportación solo a su autor y si aún ve todas sus tiendas.
func (f *Feature) Authorized(ctx context.Context, p auth.Principal, id string) (models.Export, error) {
	if !utils.ValidID(id) {
		return models.Export{}, apperrors.Invalid(constants.MsgInvalidExport)
	}

	export, err := f.deps.Repo.GetExport(ctx, repository.GetExportParams{ID: id, OrganizationID: p.OrganizationID})
	if err != nil {
		return export, err
	}

	if export.UserID != p.UserID {
		return export, apperrors.Denied()
	}

	for _, storeID := range export.StoreIds {
		if !p.CanStore(storeID) {
			return export, apperrors.Denied()
		}
	}

	return export, nil
}
