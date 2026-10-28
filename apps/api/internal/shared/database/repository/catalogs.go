package repository

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/database/models"
)

func (r *Repository) ListCountries(ctx context.Context) ([]models.Country, error) {
	out := []models.Country{}
	err := r.conn(ctx).Order("name").Find(&out).Error

	return out, err
}

func (r *Repository) SearchUbigeos(ctx context.Context, search string) ([]models.Ubigeo, error) {
	out := []models.Ubigeo{}

	err := r.conn(ctx).Where("lower(name) LIKE ?", "%"+strings.ToLower(search)+"%").
		Order("name").Limit(100).Find(&out).Error

	return out, err
}

func (r *Repository) FindUbigeosByCode(ctx context.Context, code string) ([]models.Ubigeo, error) {
	out := []models.Ubigeo{}

	err := r.conn(ctx).Where("ubigeo = ? OR ubigeo_reniec = ?", code, code).
		Order("name").Limit(1).Find(&out).Error

	return out, err
}

func (r *Repository) GetUbigeo(ctx context.Context, id string) (models.Ubigeo, error) {
	var u models.Ubigeo
	err := r.conn(ctx).Where("id = ?", id).Take(&u).Error

	return u, err
}

type ListStoresParams struct {
	OrganizationID             string
	IncludeInactive, AllStores bool
	StoreIds                   []string
}

func (r *Repository) ListStores(ctx context.Context, p ListStoresParams) ([]models.Store, error) {
	out := []models.Store{}
	q := r.conn(ctx).Where("organization_id = ?", p.OrganizationID)

	if !p.IncludeInactive {
		q = q.Where("deleted_at IS NULL")
	}

	err := storeScope(q, "id", p.AllStores, p.StoreIds).Order("created_at DESC, id").Find(&out).Error

	return out, err
}

type GetStoreParams struct{ ID, OrganizationID string }

// GetStore devuelve solo tiendas activas.
func (r *Repository) GetStore(ctx context.Context, p GetStoreParams) (models.Store, error) {
	var s models.Store

	err := r.conn(ctx).Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Take(&s).Error

	return s, err
}

// GetHistoricalStore incluye tiendas desactivadas, para documentos de reclamos antiguos.
func (r *Repository) GetHistoricalStore(ctx context.Context, p GetStoreParams) (models.Store, error) {
	var s models.Store
	err := r.conn(ctx).Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).Take(&s).Error

	return s, err
}

type CreateStoreParams struct {
	ID, OrganizationID, Slug, Name, Type, Color string
	UbigeoID, AddressType, Address, Url         string
	CreatedBy                                   *string
}

func (r *Repository) CreateStore(ctx context.Context, p CreateStoreParams) (models.Store, error) {
	s := models.Store{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		UbigeoID:       nullable(p.UbigeoID),
		Slug:           p.Slug,
		Name:           p.Name,
		Type:           p.Type,
		Color:          p.Color,
		AddressType:    nullable(p.AddressType),
		Address:        nullable(p.Address),
		Url:            nullable(p.Url),
		FormEnabled:    true,
		CreatedBy:      p.CreatedBy,
	}

	return s, r.conn(ctx).Create(&s).Error
}

type UpdateStoreParams struct {
	ID, OrganizationID, Name, Type, Color string
	UbigeoID, AddressType, Address, Url   string
	UpdatedBy                             *string
	Slug                                  *string
}

func (r *Repository) UpdateStore(ctx context.Context, p UpdateStoreParams) (models.Store, error) {
	changes := map[string]any{
		"name":         p.Name,
		"type":         p.Type,
		"color":        p.Color,
		"ubigeo_id":    nullable(p.UbigeoID),
		"address_type": nullable(p.AddressType),
		"address":      nullable(p.Address),
		"url":          nullable(p.Url),
		"updated_by":   p.UpdatedBy,
		"updated_at":   now(),
	}

	if p.Slug != nil {
		changes["slug"] = *p.Slug
	}

	result := r.conn(ctx).Model(&models.Store{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Updates(changes)

	if err := updated(result); err != nil {
		return models.Store{}, err
	}

	return r.GetStore(ctx, GetStoreParams{ID: p.ID, OrganizationID: p.OrganizationID})
}

type DeactivateStoreParams struct {
	ID, OrganizationID string
	DeletedBy          *string
}

func (r *Repository) DeactivateStore(ctx context.Context, p DeactivateStoreParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Store{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Updates(map[string]any{"deleted_at": now(), "deleted_by": p.DeletedBy, "form_enabled": false}))
}

type SetStoreFormEnabledParams struct {
	ID, OrganizationID string
	FormEnabled        bool
	UpdatedBy          *string
}

func (r *Repository) SetStoreFormEnabled(ctx context.Context, p SetStoreFormEnabledParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Store{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Updates(map[string]any{"form_enabled": p.FormEnabled, "updated_by": p.UpdatedBy, "updated_at": now()}))
}

// ListReasons incluye los motivos globales (sin empresa) y los propios de la empresa.
func (r *Repository) ListReasons(ctx context.Context, organizationID string) ([]models.ComplaintReason, error) {
	out := []models.ComplaintReason{}

	err := r.conn(ctx).Where("(organization_id = ? OR organization_id IS NULL) AND deleted_at IS NULL", organizationID).
		Order("reason, id").Find(&out).Error

	return out, err
}

type GetReasonParams struct{ ID, OrganizationID string }

func (r *Repository) GetReason(ctx context.Context, p GetReasonParams) (models.ComplaintReason, error) {
	var reason models.ComplaintReason

	err := r.conn(ctx).
		Where("id = ? AND (organization_id = ? OR organization_id IS NULL) AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Take(&reason).Error

	return reason, err
}

// GetHistoricalReason incluye motivos eliminados, para mostrar reclamos antiguos.
func (r *Repository) GetHistoricalReason(ctx context.Context, p GetReasonParams) (models.ComplaintReason, error) {
	var reason models.ComplaintReason

	err := r.conn(ctx).Where("id = ? AND (organization_id = ? OR organization_id IS NULL)", p.ID, p.OrganizationID).
		Take(&reason).Error

	return reason, err
}

type CreateReasonParams struct {
	ID, OrganizationID, ParentID, Reason string
	CreatedBy                            *string
}

func (r *Repository) CreateReason(ctx context.Context, p CreateReasonParams) (models.ComplaintReason, error) {
	reason := models.ComplaintReason{
		ID:             p.ID,
		OrganizationID: &p.OrganizationID,
		ParentID:       nullable(p.ParentID),
		Reason:         p.Reason,
		CreatedBy:      p.CreatedBy,
	}

	return reason, r.conn(ctx).Create(&reason).Error
}

type UpdateReasonParams struct {
	ID, OrganizationID, ParentID, Reason string
	UpdatedBy                            *string
}

func (r *Repository) UpdateReason(ctx context.Context, p UpdateReasonParams) (models.ComplaintReason, error) {
	result := r.conn(ctx).Model(&models.ComplaintReason{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Updates(map[string]any{
			"reason":     p.Reason,
			"parent_id":  nullable(p.ParentID),
			"updated_by": p.UpdatedBy,
			"updated_at": now(),
		})

	if err := updated(result); err != nil {
		return models.ComplaintReason{}, err
	}

	return r.GetReason(ctx, GetReasonParams{ID: p.ID, OrganizationID: p.OrganizationID})
}

type DeleteReasonParams struct {
	ID, OrganizationID string
	DeletedBy          *string
}

// DeleteReason no elimina motivos que aún tienen submotivos activos.
func (r *Repository) DeleteReason(ctx context.Context, p DeleteReasonParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.ComplaintReason{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Where("NOT EXISTS (SELECT 1 FROM complaint_reasons child WHERE child.parent_id = ? AND child.deleted_at IS NULL)", p.ID).
		Updates(map[string]any{"deleted_at": now(), "deleted_by": p.DeletedBy}))
}

func (r *Repository) ListCategories(ctx context.Context, organizationID string) ([]models.ComplaintCategory, error) {
	out := []models.ComplaintCategory{}
	err := r.conn(ctx).Where("organization_id = ?", organizationID).Order("name, id").Find(&out).Error

	return out, err
}

type GetCategoryParams struct{ ID, OrganizationID string }

func (r *Repository) GetCategory(ctx context.Context, p GetCategoryParams) (models.ComplaintCategory, error) {
	var c models.ComplaintCategory
	err := r.conn(ctx).Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).Take(&c).Error

	return c, err
}

type CreateCategoryParams struct {
	ID, OrganizationID, Name string
	Description, CreatedBy   *string
}

func (r *Repository) CreateCategory(ctx context.Context, p CreateCategoryParams) (models.ComplaintCategory, error) {
	c := models.ComplaintCategory{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		Name:           p.Name,
		Description:    p.Description,
		CreatedBy:      p.CreatedBy,
	}

	return c, r.conn(ctx).Create(&c).Error
}

type UpdateCategoryParams struct {
	ID, OrganizationID, Name string
	Description, UpdatedBy   *string
}

func (r *Repository) UpdateCategory(ctx context.Context, p UpdateCategoryParams) (models.ComplaintCategory, error) {
	result := r.conn(ctx).Model(&models.ComplaintCategory{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Updates(map[string]any{
			"name":        p.Name,
			"description": p.Description,
			"updated_by":  p.UpdatedBy,
			"updated_at":  now(),
		})

	if err := updated(result); err != nil {
		return models.ComplaintCategory{}, err
	}

	return r.GetCategory(ctx, GetCategoryParams{ID: p.ID, OrganizationID: p.OrganizationID})
}

type ClearCategoryReferencesParams struct{ OrganizationID, CategoryID string }

func (r *Repository) ClearCategoryReferences(ctx context.Context, p ClearCategoryReferencesParams) error {
	return r.conn(ctx).Model(&models.Complaint{}).
		Where("organization_id = ? AND category_id = ?", p.OrganizationID, p.CategoryID).
		Update("category_id", nil).Error
}

type DeleteCategoryParams struct{ ID, OrganizationID string }

func (r *Repository) DeleteCategory(ctx context.Context, p DeleteCategoryParams) (int64, error) {
	return rows(r.conn(ctx).Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Delete(&models.ComplaintCategory{}))
}
