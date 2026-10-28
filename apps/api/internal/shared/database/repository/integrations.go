package repository

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database/models"
)

type CreateUploadParams struct {
	ID, OrganizationID, StoreID, StorageKey, TokenHash, FileName, ContentType string
	SizeBytes                                                                 int64
	ExpiresAt                                                                 time.Time
}

func (r *Repository) CreateUpload(ctx context.Context, p CreateUploadParams) error {
	return r.conn(ctx).Create(&models.Upload{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		StoreID:        nullable(p.StoreID),
		StorageKey:     p.StorageKey,
		TokenHash:      p.TokenHash,
		FileName:       p.FileName,
		ContentType:    p.ContentType,
		SizeBytes:      p.SizeBytes,
		ExpiresAt:      p.ExpiresAt.UTC(),
	}).Error
}

type ClaimUploadParams struct{ ID, OrganizationID, StoreID, TokenHash string }

// ClaimUpload consume el archivo una sola vez: con token, propietario y sin expirar.
func (r *Repository) ClaimUpload(ctx context.Context, p ClaimUploadParams) (models.Upload, error) {
	at := now()

	result := r.conn(ctx).Model(&models.Upload{}).
		Where("id = ? AND organization_id = ? AND store_id = ? AND token_hash = ?", p.ID, p.OrganizationID, p.StoreID, p.TokenHash).
		Where("expires_at > ? AND claimed_at IS NULL", at).
		Update("claimed_at", at)

	if err := updated(result); err != nil {
		return models.Upload{}, err
	}

	var upload models.Upload
	err := r.conn(ctx).Where("id = ?", p.ID).Take(&upload).Error

	return upload, err
}

type DeleteUnclaimedUploadParams struct{ ID, TokenHash string }

// DeleteUnclaimedUpload elimina el registro y devuelve la clave del objeto a borrar.
func (r *Repository) DeleteUnclaimedUpload(ctx context.Context, p DeleteUnclaimedUploadParams) (string, error) {
	var upload models.Upload

	pending := func() *gorm.DB {
		return r.conn(ctx).Where("id = ? AND token_hash = ? AND claimed_at IS NULL", p.ID, p.TokenHash)
	}

	if err := forUpdate(pending()).Select("storage_key").Take(&upload).Error; err != nil {
		return "", err
	}

	if err := updated(pending().Delete(&models.Upload{})); err != nil {
		return "", err
	}

	return upload.StorageKey, nil
}

type AddAttachmentParams struct {
	ID, ComplaintID, StorageKey, FileName string
	ContentType                           *string
}

func (r *Repository) AddAttachment(ctx context.Context, p AddAttachmentParams) error {
	return r.conn(ctx).Create(&models.ComplaintAttachment{
		ID:          p.ID,
		ComplaintID: p.ComplaintID,
		StorageKey:  p.StorageKey,
		FileName:    p.FileName,
		ContentType: p.ContentType,
	}).Error
}

type ListAttachmentsParams struct{ OrganizationID, ID string }

func (r *Repository) ListAttachments(
	ctx context.Context,
	p ListAttachmentsParams,
) ([]models.ComplaintAttachment, error) {
	out := []models.ComplaintAttachment{}

	err := r.conn(ctx).Table("complaint_attachments AS a").Select("a.*").
		Joins("JOIN complaints c ON c.id = a.complaint_id").
		Where("c.organization_id = ? AND c.id = ?", p.OrganizationID, p.ID).
		Find(&out).Error

	return out, err
}

type AttachmentWithScope struct {
	models.ComplaintAttachment
	OrganizationID string `json:"organization_id"`
	StoreID        string `json:"store_id"`
}

type GetAttachmentParams struct{ ID, OrganizationID string }

func (r *Repository) GetAttachment(ctx context.Context, p GetAttachmentParams) (AttachmentWithScope, error) {
	var a AttachmentWithScope

	err := r.conn(ctx).Table("complaint_attachments AS a").Select("a.*, c.organization_id, c.store_id").
		Joins("JOIN complaints c ON c.id = a.complaint_id").
		Where("a.id = ? AND c.organization_id = ?", p.ID, p.OrganizationID).
		Take(&a).Error

	return a, err
}

// WebhookSummary omite el secreto cifrado y los campos internos del endpoint.
type WebhookSummary struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Slug      string      `json:"slug"`
	TargetUrl string      `json:"target_url"`
	Events    models.JSON `json:"events"`
	Status    string      `json:"status"`
	TimeoutMs int32       `json:"timeout_ms"`
}

func webhookSummary(w models.WebhookEndpoint) WebhookSummary {
	return WebhookSummary{
		ID: w.ID, Name: w.Name, Slug: w.Slug, TargetUrl: w.TargetUrl,
		Events: w.Events, Status: w.Status, TimeoutMs: w.TimeoutMs,
	}
}

type CreateWebhookParams struct {
	ID, OrganizationID, Name, Slug, TargetUrl string
	Events                                    models.JSON
	Status                                    string
	SecretEncrypted                           *string
	TimeoutMs                                 int32
	CreatedBy                                 *string
}

func (r *Repository) CreateWebhook(ctx context.Context, p CreateWebhookParams) (WebhookSummary, error) {
	w := models.WebhookEndpoint{
		ID:              p.ID,
		OrganizationID:  p.OrganizationID,
		Name:            p.Name,
		Slug:            p.Slug,
		TargetUrl:       p.TargetUrl,
		Events:          p.Events,
		Status:          p.Status,
		SecretEncrypted: p.SecretEncrypted,
		TimeoutMs:       p.TimeoutMs,
		CreatedBy:       p.CreatedBy,
	}

	return webhookSummary(w), r.conn(ctx).Create(&w).Error
}

type UpdateWebhookParams struct {
	ID, OrganizationID, Name, TargetUrl string
	Events                              models.JSON
	Status                              string
	// Vacío conserva el secreto actual.
	SecretEncrypted string
	TimeoutMs       int32
	UpdatedBy       *string
}

func (r *Repository) UpdateWebhook(ctx context.Context, p UpdateWebhookParams) (WebhookSummary, error) {
	values := map[string]any{
		"name":       p.Name,
		"target_url": p.TargetUrl,
		"events":     p.Events,
		"status":     p.Status,
		"timeout_ms": p.TimeoutMs,
		"updated_at": now(),
		"updated_by": p.UpdatedBy,
	}

	if p.SecretEncrypted != "" {
		values["secret_encrypted"] = p.SecretEncrypted
	}

	result := r.conn(ctx).Model(&models.WebhookEndpoint{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Updates(values)

	if err := updated(result); err != nil {
		return WebhookSummary{}, err
	}

	w, err := r.GetWebhook(ctx, GetWebhookParams{ID: p.ID, OrganizationID: p.OrganizationID})

	return webhookSummary(w), err
}

type WebhookListItem struct {
	WebhookSummary
	CreatedAt time.Time `json:"created_at"`
}

func (r *Repository) ListWebhooks(ctx context.Context, organizationID string) ([]WebhookListItem, error) {
	out := []WebhookListItem{}

	err := r.conn(ctx).Model(&models.WebhookEndpoint{}).
		Select("id, name, slug, target_url, events, status, timeout_ms, created_at").
		Where("organization_id = ? AND deleted_at IS NULL", organizationID).
		Order("created_at DESC").Find(&out).Error

	return out, err
}

type GetWebhookParams struct{ ID, OrganizationID string }

func (r *Repository) GetWebhook(ctx context.Context, p GetWebhookParams) (models.WebhookEndpoint, error) {
	var w models.WebhookEndpoint

	err := r.conn(ctx).Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Take(&w).Error

	return w, err
}

type DeleteWebhookParams struct {
	ID, OrganizationID string
	DeletedBy          *string
}

func (r *Repository) DeleteWebhook(ctx context.Context, p DeleteWebhookParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.WebhookEndpoint{}).
		Where("id = ? AND organization_id = ? AND deleted_at IS NULL", p.ID, p.OrganizationID).
		Updates(map[string]any{"deleted_at": now(), "deleted_by": p.DeletedBy, "status": "disabled"}))
}

type MatchingWebhooksParams struct{ OrganizationID, EventKey string }

// MatchingWebhooks filtra en Go los eventos suscritos: el arreglo JSON se evalúa igual en
// ambos motores y una empresa tiene pocos endpoints activos.
func (r *Repository) MatchingWebhooks(ctx context.Context, p MatchingWebhooksParams) ([]models.WebhookEndpoint, error) {
	var active []models.WebhookEndpoint

	err := r.conn(ctx).Where("organization_id = ? AND status = ? AND deleted_at IS NULL", p.OrganizationID, "active").
		Find(&active).Error
	if err != nil {
		return nil, err
	}

	out := []models.WebhookEndpoint{}

	for _, endpoint := range active {
		var events []string
		if json.Unmarshal(endpoint.Events, &events) == nil && slices.Contains(events, p.EventKey) {
			out = append(out, endpoint)
		}
	}

	return out, nil
}

type AddWebhookDeliveryParams struct {
	ID, OrganizationID   string
	EndpointID           *string
	EventKey, EntityType string
	EntityID             *string
	RequestBody          models.JSON
}

func (r *Repository) AddWebhookDelivery(ctx context.Context, p AddWebhookDeliveryParams) error {
	return r.conn(ctx).Create(&models.WebhookDelivery{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		EndpointID:     p.EndpointID,
		EventKey:       p.EventKey,
		EntityType:     p.EntityType,
		EntityID:       p.EntityID,
		Status:         "pending",
		RequestBody:    p.RequestBody,
	}).Error
}

type GetWebhookDeliveryParams struct{ ID, OrganizationID string }

func (r *Repository) GetWebhookDelivery(
	ctx context.Context,
	p GetWebhookDeliveryParams,
) (models.WebhookDelivery, error) {
	var d models.WebhookDelivery
	err := r.conn(ctx).Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).Take(&d).Error

	return d, err
}

func (r *Repository) ListWebhookDeliveries(
	ctx context.Context,
	organizationID string,
) ([]models.WebhookDelivery, error) {
	out := []models.WebhookDelivery{}
	err := r.conn(ctx).Where("organization_id = ?", organizationID).Order("created_at DESC").Limit(100).Find(&out).Error

	return out, err
}

type SetWebhookDeliveryParams struct {
	ID, OrganizationID, Status string
	ResponseStatus             *int32
	ErrorMessage, ResponseBody *string
}

func (r *Repository) SetWebhookDelivery(ctx context.Context, p SetWebhookDeliveryParams) error {
	at := now()
	var sentAt *time.Time

	if p.Status == "sent" {
		sentAt = &at
	}

	return r.conn(ctx).Model(&models.WebhookDelivery{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Updates(map[string]any{
			"status":          p.Status,
			"attempt_count":   gorm.Expr("attempt_count + 1"),
			"response_status": p.ResponseStatus,
			"error_message":   p.ErrorMessage,
			"response_body":   p.ResponseBody,
			"sent_at":         sentAt,
			"updated_at":      at,
		}).Error
}
