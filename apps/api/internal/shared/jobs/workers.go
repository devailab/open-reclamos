package jobs

import (
	"context"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/storage"
)

// DeleteObjectWorker borra archivos fuera de la transacción que los liberó.
type DeleteObjectWorker struct {
	river.WorkerDefaults[DeleteObjectArgs]
	Storage *storage.Storage
}

func (w *DeleteObjectWorker) Work(ctx context.Context, job *river.Job[DeleteObjectArgs]) error {
	return w.Storage.Delete(ctx, job.Args.Key)
}

// CleanupWorker elimina datos temporales vencidos.
type CleanupWorker struct {
	river.WorkerDefaults[CleanupArgs]
	Repo    *repository.Repository
	Storage *storage.Storage
}

func (w *CleanupWorker) Work(ctx context.Context, _ *river.Job[CleanupArgs]) error {
	uploads, err := w.Repo.ExpiredUploads(ctx)
	if err != nil {
		return err
	}

	for _, u := range uploads {
		if err = w.Storage.Delete(ctx, u.StorageKey); err != nil {
			return err
		}

		if err = w.Repo.DeleteExpiredUpload(ctx, u.ID); err != nil {
			return err
		}
	}

	if err = w.Repo.DeleteExpiredSessions(ctx); err != nil {
		return err
	}

	exports, err := w.Repo.ExpiredExports(ctx)
	if err != nil {
		return err
	}

	for _, export := range exports {
		if export.StorageKey != nil {
			if err = w.Storage.Delete(ctx, *export.StorageKey); err != nil {
				return err
			}
		}

		if err = w.Repo.DeleteExpiredExport(ctx, export.ID); err != nil {
			return err
		}
	}

	return w.Repo.DeleteExpiredAttempts(ctx)
}
