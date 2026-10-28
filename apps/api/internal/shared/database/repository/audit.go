package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database/models"
)

type AddAuditParams struct {
	ID, OrganizationID, UserID string
	Action, EntityType         string
	EntityID                   string
	OldData, NewData           models.JSON
}

func (r *Repository) AddAudit(ctx context.Context, p AddAuditParams) error {
	return r.conn(ctx).Create(&models.AuditLog{
		ID:             p.ID,
		OrganizationID: nullable(p.OrganizationID),
		UserID:         nullable(p.UserID),
		Action:         p.Action,
		EntityType:     p.EntityType,
		EntityID:       nullable(p.EntityID),
		OldData:        p.OldData,
		NewData:        p.NewData,
	}).Error
}

type AuditFilter struct {
	OrganizationID string
	AllStores      bool
	StoreIds       []string
	EntityID       string
	EntityType     string
	UserID         string
	Action         string
	DateStart      *time.Time
	DateEnd        *time.Time
	PageSize       int
	PageOffset     int
}

func (r *Repository) filteredAudit(ctx context.Context, f AuditFilter) *gorm.DB {
	q := r.conn(ctx).Table("audit_logs AS a").Where("a.organization_id = ?", f.OrganizationID)

	if !f.AllStores {
		// Con tiendas seleccionadas solo se ve la auditoría de esas tiendas y sus reclamos.
		ids := nonNil(f.StoreIds)

		q = q.Where("(a.entity_type = 'complaint' AND EXISTS (SELECT 1 FROM complaints c "+
			"WHERE c.organization_id = a.organization_id AND c.id = a.entity_id AND c.store_id IN ?)) "+
			"OR (a.entity_type = 'store' AND a.entity_id IN ?)", ids, ids)
	}

	for _, filter := range []struct{ column, value string }{
		{"a.entity_id", f.EntityID}, {"a.entity_type", f.EntityType},
		{"a.action", f.Action}, {"a.user_id", f.UserID},
	} {
		if filter.value != "" {
			q = q.Where(filter.column+" = ?", filter.value)
		}
	}

	if f.DateStart != nil {
		q = q.Where("a.created_at >= ?", f.DateStart.UTC())
	}

	if f.DateEnd != nil {
		q = q.Where("a.created_at < ?", f.DateEnd.UTC())
	}

	return q
}

func (r *Repository) SearchAudit(ctx context.Context, f AuditFilter) ([]models.AuditLog, error) {
	out := []models.AuditLog{}

	err := r.filteredAudit(ctx, f).Select("a.*").Order("a.created_at DESC, a.id").
		Limit(f.PageSize).Offset(f.PageOffset).Find(&out).Error

	return out, err
}

func (r *Repository) CountAudit(ctx context.Context, f AuditFilter) (int64, error) {
	var n int64
	err := r.filteredAudit(ctx, f).Count(&n).Error

	return n, err
}
