package exports

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/storage"
	"openreclamos.com/api/internal/shared/utils"
)

// Worker genera exportaciones encoladas re-validando el acceso del autor.
type Worker struct {
	river.WorkerDefaults[jobs.ExportArgs]
	Feature *Feature
}

func (w *Worker) Work(ctx context.Context, job *river.Job[jobs.ExportArgs]) (workErr error) {
	f := w.Feature

	export, err := f.deps.Repo.GetExport(
		ctx,
		repository.GetExportParams{ID: job.Args.ExportID, OrganizationID: job.Args.OrganizationID},
	)
	if err != nil {
		return river.JobCancel(err)
	}

	if export.Status == constants.ExportCompleted {
		return nil
	}

	defer func() {
		if workErr != nil {
			workErr = f.markFailure(ctx, job, export, workErr)
		}
	}()

	p, err := f.authorPrincipal(ctx, export)
	if err != nil {
		return river.JobCancel(err)
	}

	var filters map[string]any

	if err = json.Unmarshal(export.Filters, &filters); err != nil {
		return err
	}

	out, err := f.documents.RenderBook(
		ctx,
		p,
		operation.Input{Data: map[string]any{"format": export.Format}, Filters: filters},
	)
	if err != nil {
		return err
	}

	key := storage.PrefixExports + export.OrganizationID + "/" + export.ID + "." + export.Format

	if err = f.deps.Storage.Put(ctx, key, out.ContentType, out.Document); err != nil {
		return err
	}

	_, err = f.deps.Repo.SetExportResult(
		ctx,
		repository.SetExportResultParams{
			ID:             export.ID,
			OrganizationID: export.OrganizationID,
			Status:         constants.ExportCompleted,
			StorageKey:     &key,
		},
	)

	return err
}

// authorPrincipal reconstruye el acceso del autor limitado a las tiendas fijadas en la exportación.
func (f *Feature) authorPrincipal(ctx context.Context, export models.Export) (auth.Principal, error) {
	user, err := f.deps.Repo.GetUser(ctx, export.UserID)
	if err != nil || !user.Active {
		return auth.Principal{}, apperrors.Denied()
	}

	p, err := f.deps.Auth.Tenant(
		ctx,
		auth.Principal{UserID: export.UserID, OrganizationID: export.OrganizationID, AuthMethod: constants.AuthAPI},
		export.OrganizationID,
	)
	if err != nil {
		return p, err
	}

	for _, id := range export.StoreIds {
		if !p.CanStore(id) {
			return p, apperrors.Denied()
		}
	}

	p.AllStores = false
	p.StoreIDs = export.StoreIds

	return p, nil
}

// markFailure deja la exportación en cola para reintento o fallida si se agotaron los intentos.
func (f *Feature) markFailure(
	ctx context.Context,
	job *river.Job[jobs.ExportArgs],
	export models.Export,
	workErr error,
) error {
	var cancelled *river.JobCancelError
	status := constants.ExportQueued

	if errors.As(workErr, &cancelled) || job.JobRow != nil && job.Attempt >= job.MaxAttempts {
		status = constants.ExportFailed
	}

	updateContext, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()

	_, updateErr := f.deps.Repo.SetExportResult(
		updateContext,
		repository.SetExportResultParams{
			ID:             export.ID,
			OrganizationID: export.OrganizationID,
			Status:         status,
			ErrorMessage:   utils.Ptr(constants.MsgExportFailed),
		},
	)
	if updateErr != nil {
		return errors.Join(workErr, updateErr)
	}

	return workErr
}
