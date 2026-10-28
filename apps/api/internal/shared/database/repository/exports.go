package repository

import (
	"context"
	"time"

	"openreclamos.com/api/internal/shared/database/models"
)

type CreateExportParams struct {
	ID, OrganizationID, UserID string
	StoreIds                   []string
	Filters                    models.JSON
	Format                     string
	ExpiresAt                  time.Time
}

func (r *Repository) CreateExport(ctx context.Context, p CreateExportParams) error {
	return r.conn(ctx).Create(&models.Export{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		UserID:         p.UserID,
		StoreIds:       nonNil(p.StoreIds),
		Filters:        p.Filters,
		Format:         p.Format,
		Status:         "queued",
		ExpiresAt:      p.ExpiresAt.UTC(),
	}).Error
}

type GetExportParams struct{ ID, OrganizationID string }

// GetExport ignora exportaciones caducadas.
func (r *Repository) GetExport(ctx context.Context, p GetExportParams) (models.Export, error) {
	var e models.Export

	err := r.conn(ctx).Where("id = ? AND organization_id = ? AND expires_at > ?", p.ID, p.OrganizationID, now()).
		Take(&e).Error

	return e, err
}

type SetExportResultParams struct {
	ID, OrganizationID, Status string
	StorageKey, ErrorMessage   *string
}

func (r *Repository) SetExportResult(ctx context.Context, p SetExportResultParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Export{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Updates(map[string]any{"status": p.Status, "storage_key": p.StorageKey, "error_message": p.ErrorMessage}))
}
