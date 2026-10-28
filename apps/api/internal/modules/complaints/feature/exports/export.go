package exports

import (
	"context"
	"time"

	"github.com/riverqueue/river"
	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	// maxExportRows es el máximo de reclamos por exportación.
	maxExportRows = 10000
	// syncExportRows es el máximo que se genera en la misma petición.
	syncExportRows = 200
	// exportLifetime es el tiempo que el archivo queda disponible.
	exportLifetime = 24 * time.Hour
)

// Export genera el libro al instante (≤200 filas) o encola una exportación asíncrona.
func (f *Feature) Export(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	format := utils.Text(in.Data, "format")
	if format == "" {
		format = constants.FormatPDF
	}

	if format != constants.FormatPDF && format != constants.FormatXLSX {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidFormat)
	}

	if err := complaintutils.ValidateFilters(in.Filters); err != nil {
		return operation.Output{}, err
	}

	count, err := f.deps.Repo.CountComplaints(ctx, complaintutils.ListFilter(p, in))
	if err != nil {
		return operation.Output{}, err
	}

	if count > maxExportRows {
		return operation.Output{}, apperrors.Invalid(constants.MsgExportTooLarge)
	}

	if count <= syncExportRows && !utils.Bool(in.Data, "async") {
		return f.documents.RenderBook(ctx, p, in)
	}

	if !f.deps.Jobs.Ready() {
		return operation.Output{}, apperrors.Conflict(constants.MsgWorkersNotReady)
	}

	storeIDs, err := f.visibleStoreIDs(ctx, p)
	if err != nil {
		return operation.Output{}, err
	}

	// Congela el rango para que la exportación no incluya reclamos posteriores.
	now := time.Now().UTC()
	end, _ := time.Parse(time.RFC3339, utils.Text(in.Filters, "date_end"))
	if end.IsZero() || end.After(now) {
		in.Filters["date_end"] = now.Format(time.RFC3339Nano)
	}

	id := utils.NewID()

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := q.CreateExport(ctx, repository.CreateExportParams{ID: id, OrganizationID: p.OrganizationID, UserID: p.UserID, StoreIds: storeIDs, Filters: utils.JSONBytes(in.Filters), Format: format, ExpiresAt: time.Now().Add(exportLifetime)}); err != nil {
			return err
		}

		return f.deps.Jobs.InsertTx(
			ctx,
			q,
			jobs.ExportArgs{OrganizationID: p.OrganizationID, ExportID: id},
			&river.InsertOpts{MaxAttempts: 3, UniqueOpts: river.UniqueOpts{ByArgs: true}},
		)
	})

	return operation.Record(map[string]string{"id": id, "status": constants.ExportQueued}), err
}

// visibleStoreIDs fija las tiendas visibles al crear la exportación (incluye inactivas).
func (f *Feature) visibleStoreIDs(ctx context.Context, p auth.Principal) ([]string, error) {
	stores, err := f.deps.Repo.ListStores(
		ctx,
		repository.ListStoresParams{
			OrganizationID:  p.OrganizationID,
			AllStores:       p.AllStores,
			StoreIds:        p.StoreIDs,
			IncludeInactive: true,
		},
	)
	if err != nil {
		return nil, err
	}

	ids := []string{}

	for _, store := range stores {
		ids = append(ids, store.ID)
	}

	return ids, nil
}
