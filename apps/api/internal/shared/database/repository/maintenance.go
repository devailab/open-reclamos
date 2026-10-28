package repository

import (
	"context"

	"openreclamos.com/api/internal/shared/database/models"
)

// Limpieza periódica: se procesa por lotes para acotar cada ejecución.
const cleanupBatch = 100

type ExpiredUpload struct {
	ID         string
	StorageKey string
}

func (r *Repository) ExpiredUploads(ctx context.Context) ([]ExpiredUpload, error) {
	var out []ExpiredUpload

	err := r.conn(ctx).Model(&models.Upload{}).Select("id, storage_key").
		Where("expires_at < ? AND claimed_at IS NULL", now()).Limit(cleanupBatch).Find(&out).Error

	return out, err
}

func (r *Repository) DeleteExpiredUpload(ctx context.Context, id string) error {
	return r.conn(ctx).Where("id = ? AND expires_at < ? AND claimed_at IS NULL", id, now()).
		Delete(&models.Upload{}).Error
}

type ExpiredExport struct {
	ID         string
	StorageKey *string
}

func (r *Repository) ExpiredExports(ctx context.Context) ([]ExpiredExport, error) {
	var out []ExpiredExport

	err := r.conn(ctx).Model(&models.Export{}).Select("id, storage_key").
		Where("expires_at < ?", now()).Limit(cleanupBatch).Find(&out).Error

	return out, err
}

func (r *Repository) DeleteExpiredExport(ctx context.Context, id string) error {
	return r.conn(ctx).Where("id = ? AND expires_at < ?", id, now()).Delete(&models.Export{}).Error
}

func (r *Repository) DeleteExpiredSessions(ctx context.Context) error {
	return r.conn(ctx).Where("expires_at < ?", now()).Delete(&models.Session{}).Error
}

// Los intentos SSO se conservan un día después de expirar para auditar reintentos.
func (r *Repository) DeleteExpiredAttempts(ctx context.Context) error {
	return r.conn(ctx).Where("expires_at < ?", now().AddDate(0, 0, -1)).Delete(&models.SSOLoginAttempt{}).Error
}
