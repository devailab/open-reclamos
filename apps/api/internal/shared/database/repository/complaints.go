package repository

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"openreclamos.com/api/internal/shared/database/models"
)

type PublicOrganization struct {
	ID                   string  `json:"id"`
	Slug                 string  `json:"slug"`
	Name                 string  `json:"name"`
	LegalName            string  `json:"legal_name"`
	TaxID                string  `json:"tax_id"`
	AddressType          string  `json:"address_type"`
	Address              string  `json:"address"`
	Website              *string `json:"website"`
	PhoneCode            *string `json:"phone_code"`
	Phone                *string `json:"phone"`
	PrimaryColor         *string `json:"primary_color"`
	LogoKey              *string `json:"logo_key"`
	FormEnabled          bool    `json:"form_enabled"`
	ResponseDeadlineDays int32   `json:"response_deadline_days"`
}

// GetPublicOrganization solo encuentra empresas activas.
func (r *Repository) GetPublicOrganization(ctx context.Context, slug string) (PublicOrganization, error) {
	var o PublicOrganization

	err := r.conn(ctx).Table("organizations AS o").
		Select("o.id, o.slug, o.name, o.legal_name, o.tax_id, o.address_type, o.address, o.website, "+
			"o.phone_code, o.phone, o.primary_color, o.logo_key, s.form_enabled, s.response_deadline_days").
		Joins("JOIN organization_settings s ON s.organization_id = o.id").
		Where("o.slug = ? AND o.status = ? AND o.deleted_at IS NULL", slug, "active").
		Take(&o).Error

	return o, err
}

type PublicStore struct {
	models.Store
	OrganizationSlug string `json:"organization_slug"`
	OrganizationName string `json:"organization_name"`
}

// GetPublicStore encuentra una tienda que admite reclamos y bloquea en modo compartido la
// tienda, la empresa y sus ajustes para que no se desactiven durante el registro.
func (r *Repository) GetPublicStore(ctx context.Context, slug string) (PublicStore, error) {
	var s PublicStore

	err := forShare(r.conn(ctx)).Table("stores AS s").
		Select("s.*, o.slug AS organization_slug, o.name AS organization_name").
		Joins("JOIN organizations o ON o.id = s.organization_id").
		Joins("JOIN organization_settings settings ON settings.organization_id = o.id").
		Where("s.slug = ? AND s.deleted_at IS NULL AND o.status = ?", slug, "active").
		Where("settings.form_enabled = ? AND s.form_enabled = ?", true, true).
		Take(&s).Error

	return s, err
}

type NextCorrelativeParams struct{ ID, StoreID string }

// NextCorrelative incrementa el correlativo de la tienda; debe usarse dentro de una transacción.
func (r *Repository) NextCorrelative(ctx context.Context, p NextCorrelativeParams) (int32, error) {
	err := r.conn(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "store_id"}},
		DoUpdates: clause.Set{
			{Column: clause.Column{Name: "current_value"}, Value: gorm.Expr("store_correlatives.current_value + 1")},
			{Column: clause.Column{Name: "updated_at"}, Value: now()},
		},
	}).Create(&models.StoreCorrelative{ID: p.ID, StoreID: p.StoreID, CurrentValue: 1}).Error
	if err != nil {
		return 0, err
	}

	var correlative models.StoreCorrelative
	err = r.conn(ctx).Select("current_value").Where("store_id = ?", p.StoreID).Take(&correlative).Error

	return correlative.CurrentValue, err
}

// las fechas siempre se guardan en utc
func (r *Repository) CreateComplaint(ctx context.Context, c *models.Complaint) error {
	c.ResponseDeadline = c.ResponseDeadline.UTC()

	if c.IncidentDate != nil {
		incident := c.IncidentDate.UTC()
		c.IncidentDate = &incident
	}

	return r.conn(ctx).Create(c).Error
}

type GetComplaintParams struct {
	ID, OrganizationID string
	AllStores          bool
	StoreIds           []string
}

// solo deja ver la empresa y las tiendas permitidas
func (r *Repository) complaintByScope(ctx context.Context, p GetComplaintParams) *gorm.DB {
	q := r.conn(ctx).Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID)

	return storeScope(q, "store_id", p.AllStores, p.StoreIds)
}

func (r *Repository) GetComplaint(ctx context.Context, p GetComplaintParams) (models.Complaint, error) {
	var c models.Complaint
	err := r.complaintByScope(ctx, p).Take(&c).Error

	return c, err
}

// LockComplaint bloquea el reclamo para evitar respuestas o cambios de estado duplicados.
func (r *Repository) LockComplaint(ctx context.Context, p GetComplaintParams) (models.Complaint, error) {
	var c models.Complaint
	err := forUpdate(r.complaintByScope(ctx, p)).Take(&c).Error

	return c, err
}

type ComplaintFilter struct {
	OrganizationID string
	AllStores      bool
	StoreIds       []string
	StoreFilter    string
	Status         string
	Type           string
	Priority       string
	CategoryFilter string
	DateStart      *time.Time
	DateEnd        *time.Time
	Search         string
	Overdue        bool
	ActiveOnly     bool
	SortOrder      string
	PageSize       int
	PageOffset     int
}

// consulta base: respeta las tiendas permitidas y aplica solo los filtros con valor
func (r *Repository) filteredComplaints(ctx context.Context, f ComplaintFilter) *gorm.DB {
	q := r.conn(ctx).Table("complaints AS c").Where("c.organization_id = ?", f.OrganizationID)
	q = storeScope(q, "c.store_id", f.AllStores, f.StoreIds)

	for _, filter := range []struct{ column, value string }{
		{"c.store_id", f.StoreFilter}, {"c.status", f.Status}, {"c.type", f.Type},
		{"c.priority", f.Priority}, {"c.category_id", f.CategoryFilter},
	} {
		if filter.value != "" {
			q = q.Where(filter.column+" = ?", filter.value)
		}
	}

	if f.DateStart != nil {
		q = q.Where("c.created_at >= ?", f.DateStart.UTC())
	}

	if f.DateEnd != nil {
		q = q.Where("c.created_at < ?", f.DateEnd.UTC())
	}

	if f.Overdue {
		q = q.Where("c.status <> ? AND c.response_deadline < ?", "resolved", now())
	}

	if f.ActiveOnly {
		q = q.Where("c.status <> ?", "resolved")
	}

	if f.Search != "" {
		q = q.Where(
			"lower(c.first_name || ' ' || c.last_name || ' ' || c.correlative || ' ' || c.tracking_code) LIKE ?",
			"%"+strings.ToLower(f.Search)+"%",
		)
	}

	return q
}

type ComplaintListItem struct {
	models.Complaint
	StoreName        string     `json:"store_name"`
	StoreColor       string     `json:"store_color"`
	CategoryName     *string    `json:"category_name"`
	OfficialResponse *string    `json:"official_response"`
	RespondedAt      *time.Time `json:"responded_at"`
	HasResponse      bool       `json:"has_response"`
	Total            int64      `json:"total"`
}

// orden de prioridad: urgente, alta, media y las demás al final
const priorityRank = "CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"

func (r *Repository) ListComplaints(ctx context.Context, f ComplaintFilter) ([]ComplaintListItem, error) {
	out := []ComplaintListItem{}

	// junta tienda, categoría y respuesta; total es la cantidad sin paginar
	q := r.filteredComplaints(ctx, f).
		Select("c.*, s.name AS store_name, s.color AS store_color, cat.name AS category_name, " +
			"d.official_response, d.responded_at, d.official_response IS NOT NULL AS has_response, " +
			"count(*) OVER() AS total").
		Joins("JOIN stores s ON s.id = c.store_id AND s.organization_id = c.organization_id").
		Joins("LEFT JOIN complaint_categories cat ON cat.id = c.category_id AND cat.organization_id = c.organization_id").
		Joins("LEFT JOIN complaint_details d ON d.complaint_id = c.id AND d.organization_id = c.organization_id")

	switch f.SortOrder {
	case "featured":
		// Primero lo pendiente más próximo a vencer; la prioridad desempata dentro del día.
		// El instante se genera en Go (no es entrada del usuario) y se incrusta como número.
		q = q.Order(fmt.Sprintf("CASE WHEN c.status <> 'resolved' THEN (%s - %d) / 86400.0 * 4 ELSE 20000 END + %s",
			r.epochSeconds("c.response_deadline"), now().Unix(), priorityRank))

	case "priority":
		q = q.Order(priorityRank)
	}

	// si hay empate, va primero el más reciente
	err := q.Order("c.created_at DESC, c.id").Limit(f.PageSize).Offset(f.PageOffset).Find(&out).Error

	return out, err
}

func (r *Repository) CountComplaints(ctx context.Context, f ComplaintFilter) (int64, error) {
	var n int64
	err := r.filteredComplaints(ctx, f).Count(&n).Error

	return n, err
}

type GetScopedTrackingIDParams struct {
	OrganizationID, TrackingCode string
	AllStores                    bool
	StoreIds                     []string
}

// busca el id con el código de seguimiento, solo en las tiendas permitidas
func (r *Repository) GetScopedTrackingID(ctx context.Context, p GetScopedTrackingIDParams) (string, error) {
	var c models.Complaint
	q := r.conn(ctx).Select("id").Where("organization_id = ? AND tracking_code = ?", p.OrganizationID, p.TrackingCode)
	err := storeScope(q, "store_id", p.AllStores, p.StoreIds).Take(&c).Error

	return c.ID, err
}

type GetComplaintDetailsParams struct{ OrganizationID, ComplaintID string }

func (r *Repository) GetComplaintDetails(
	ctx context.Context,
	p GetComplaintDetailsParams,
) (models.ComplaintDetail, error) {
	var d models.ComplaintDetail
	err := r.conn(ctx).Where("organization_id = ? AND complaint_id = ?", p.OrganizationID, p.ComplaintID).Take(&d).Error

	return d, err
}

type SaveDraftParams struct {
	ID, OrganizationID, ComplaintID string
	DraftResponse, DraftSavedBy     *string
}

// SaveDraft no sobrescribe reclamos que ya tienen respuesta oficial.
func (r *Repository) SaveDraft(ctx context.Context, p SaveDraftParams) error {
	at := now()

	return r.conn(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "complaint_id"}},
		DoUpdates: append(clause.AssignmentColumns([]string{"draft_response", "draft_saved_by"}),
			clause.Assignment{Column: clause.Column{Name: "draft_updated_at"}, Value: at},
			clause.Assignment{Column: clause.Column{Name: "updated_at"}, Value: at}),
		Where: unansweredDetails,
	}).Create(&models.ComplaintDetail{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		ComplaintID:    p.ComplaintID,
		DraftResponse:  p.DraftResponse,
		DraftUpdatedAt: &at,
		DraftSavedBy:   p.DraftSavedBy,
	}).Error
}

type SaveOfficialResponseParams struct {
	ID, OrganizationID, ComplaintID string
	OfficialResponse, RespondedBy   *string
}

// SaveOfficialResponse registra la respuesta solo una vez y descarta el borrador.
func (r *Repository) SaveOfficialResponse(ctx context.Context, p SaveOfficialResponseParams) error {
	at := now()

	return r.conn(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "complaint_id"}},
		DoUpdates: append(clause.AssignmentColumns([]string{"official_response", "responded_by"}),
			clause.Assignment{Column: clause.Column{Name: "responded_at"}, Value: at},
			clause.Assignment{Column: clause.Column{Name: "draft_response"}, Value: nil},
			clause.Assignment{Column: clause.Column{Name: "draft_updated_at"}, Value: nil},
			clause.Assignment{Column: clause.Column{Name: "draft_saved_by"}, Value: nil},
			clause.Assignment{Column: clause.Column{Name: "updated_at"}, Value: at}),
		Where: unansweredDetails,
	}).Create(&models.ComplaintDetail{
		ID:               p.ID,
		OrganizationID:   p.OrganizationID,
		ComplaintID:      p.ComplaintID,
		OfficialResponse: p.OfficialResponse,
		RespondedAt:      &at,
		RespondedBy:      p.RespondedBy,
	}).Error
}

// condición para no sobrescribir un reclamo que ya tiene respuesta oficial
var unansweredDetails = clause.Where{Exprs: []clause.Expression{clause.Expr{
	SQL: "complaint_details.organization_id = excluded.organization_id AND complaint_details.official_response IS NULL",
}}}

type UpdateComplaintStateParams struct {
	ID, OrganizationID, Status string
	UpdatedBy                  *string
}

func (r *Repository) UpdateComplaintState(ctx context.Context, p UpdateComplaintStateParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Complaint{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Updates(map[string]any{"status": p.Status, "updated_at": now(), "updated_by": p.UpdatedBy}))
}

type ClassifyComplaintParams struct {
	ID, OrganizationID, Priority, CategoryID string
	UpdatedBy                                *string
}

// si la categoría viene vacía, se guarda como null
func (r *Repository) ClassifyComplaint(ctx context.Context, p ClassifyComplaintParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Complaint{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Updates(map[string]any{
			"priority":    p.Priority,
			"category_id": nullable(p.CategoryID),
			"updated_at":  now(),
			"updated_by":  p.UpdatedBy,
		}))
}

type AddHistoryParams struct {
	ID, ComplaintID, EventType                     string
	FromStatus, ToStatus, PublicNote, InternalNote string
	PerformedBy, PerformedByRole                   string
}

// los campos opcionales vacíos se guardan como null
func (r *Repository) AddHistory(ctx context.Context, p AddHistoryParams) error {
	return r.conn(ctx).Create(&models.ComplaintHistory{
		ID:              p.ID,
		ComplaintID:     p.ComplaintID,
		EventType:       p.EventType,
		FromStatus:      nullable(p.FromStatus),
		ToStatus:        nullable(p.ToStatus),
		PublicNote:      nullable(p.PublicNote),
		InternalNote:    nullable(p.InternalNote),
		PerformedBy:     nullable(p.PerformedBy),
		PerformedByRole: p.PerformedByRole,
	}).Error
}

type HistoryEntry struct {
	models.ComplaintHistory
	PerformedByName *string `json:"performed_by_name"`
}

type ListHistoryParams struct{ OrganizationID, ID string }

func (r *Repository) ListHistory(ctx context.Context, p ListHistoryParams) ([]HistoryEntry, error) {
	out := []HistoryEntry{}

	err := r.conn(ctx).Table("complaint_history AS h").Select("h.*, trim(u.name || ' ' || u.last_name) AS performed_by_name").
		Joins("JOIN complaints c ON c.id = h.complaint_id").
		Joins("LEFT JOIN users u ON u.id = h.performed_by").
		Where("c.organization_id = ? AND c.id = ?", p.OrganizationID, p.ID).
		Order("h.created_at, h.id").Find(&out).Error

	return out, err
}

type PublicTracking struct {
	ID               string    `json:"id"`
	TrackingCode     string    `json:"tracking_code"`
	Correlative      string    `json:"correlative"`
	Status           string    `json:"status"`
	Type             string    `json:"type"`
	CreatedAt        time.Time `json:"created_at"`
	ResponseDeadline time.Time `json:"response_deadline"`
}

type GetPublicTrackingParams struct{ Slug, TrackingCode string }

// consulta pública: solo empresas activas
func (r *Repository) GetPublicTracking(ctx context.Context, p GetPublicTrackingParams) (PublicTracking, error) {
	var t PublicTracking

	err := r.conn(ctx).Table("complaints AS c").
		Select("c.id, c.tracking_code, c.correlative, c.status, c.type, c.created_at, c.response_deadline").
		Joins("JOIN organizations o ON o.id = c.organization_id").
		Where("o.slug = ? AND o.status = ? AND c.tracking_code = ?", p.Slug, "active", p.TrackingCode).
		Take(&t).Error

	return t, err
}

type PublicHistoryEntry struct {
	EventType  string    `json:"event_type"`
	FromStatus *string   `json:"from_status"`
	ToStatus   *string   `json:"to_status"`
	PublicNote *string   `json:"public_note"`
	CreatedAt  time.Time `json:"created_at"`
}

func (r *Repository) ListPublicHistory(ctx context.Context, p ListHistoryParams) ([]PublicHistoryEntry, error) {
	out := []PublicHistoryEntry{}

	err := r.conn(ctx).Table("complaint_history AS h").
		Select("h.event_type, h.from_status, h.to_status, h.public_note, h.created_at").
		Joins("JOIN complaints c ON c.id = h.complaint_id").
		Where("c.organization_id = ? AND c.id = ? AND h.public_note IS NOT NULL", p.OrganizationID, p.ID).
		Order("h.created_at, h.id").Find(&out).Error

	return out, err
}

type Dashboard struct {
	Total    int64 `json:"total"`
	Open     int64 `json:"open"`
	InReview int64 `json:"in_review"`
	Resolved int64 `json:"resolved"`
	Overdue  int64 `json:"overdue"`
}

type GetDashboardParams struct {
	OrganizationID string
	AllStores      bool
	StoreIds       []string
}

// cuenta los reclamos por estado en una sola consulta; vencido es no resuelto con el plazo pasado
func (r *Repository) GetDashboard(ctx context.Context, p GetDashboardParams) (Dashboard, error) {
	var d Dashboard

	q := r.conn(ctx).Model(&models.Complaint{}).
		Select("count(*) AS total, "+
			"count(CASE WHEN status = 'open' THEN 1 END) AS open, "+
			"count(CASE WHEN status = 'in_review' THEN 1 END) AS in_review, "+
			"count(CASE WHEN status = 'resolved' THEN 1 END) AS resolved, "+
			"count(CASE WHEN status <> 'resolved' AND response_deadline < ? THEN 1 END) AS overdue", now()).
		Where("organization_id = ?", p.OrganizationID)

	err := storeScope(q, "store_id", p.AllStores, p.StoreIds).Take(&d).Error

	return d, err
}

type TrendPoint struct {
	Day   string `json:"day"`
	Total int64  `json:"total"`
}

type DailyTrendParams struct {
	OrganizationID string
	AllStores      bool
	StoreIds       []string
	Days           int
	// Zona horaria en la que se agrupan los días.
	Location *time.Location
}

// DailyTrend agrupa por día local en Go; así no depende de funciones de fecha del motor.
func (r *Repository) DailyTrend(ctx context.Context, p DailyTrendParams) ([]TrendPoint, error) {
	var created []time.Time

	q := r.conn(ctx).Model(&models.Complaint{}).
		Where("organization_id = ? AND created_at >= ?", p.OrganizationID, now().AddDate(0, 0, -p.Days))

	if err := storeScope(q, "store_id", p.AllStores, p.StoreIds).Pluck("created_at", &created).Error; err != nil {
		return nil, err
	}

	totals := map[string]int64{}

	for _, at := range created {
		totals[at.In(p.Location).Format(time.DateOnly)]++
	}

	out := make([]TrendPoint, 0, len(totals))

	for day, total := range totals {
		out = append(out, TrendPoint{Day: day, Total: total})
	}

	slices.SortFunc(out, func(a, b TrendPoint) int { return strings.Compare(a.Day, b.Day) })

	return out, nil
}

type GetDeliveriesParams struct{ OrganizationID, ComplaintID string }

func (r *Repository) GetDeliveries(ctx context.Context, p GetDeliveriesParams) (models.ComplaintDelivery, error) {
	var d models.ComplaintDelivery
	err := r.conn(ctx).Where("organization_id = ? AND complaint_id = ?", p.OrganizationID, p.ComplaintID).Take(&d).Error

	return d, err
}

type UpsertDeliveriesParams struct {
	ID, OrganizationID, ComplaintID               string
	ReceiptDeliveryStatus, ResponseDeliveryStatus *string
}

// UpsertDeliveries actualiza solo los estados informados y conserva los demás.
func (r *Repository) UpsertDeliveries(ctx context.Context, p UpsertDeliveriesParams) error {
	return r.conn(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "complaint_id"}},
		DoUpdates: clause.Set{
			{Column: clause.Column{Name: "receipt_delivery_status"}, Value: gorm.Expr(
				"COALESCE(excluded.receipt_delivery_status, complaint_deliveries.receipt_delivery_status)")},
			{Column: clause.Column{Name: "response_delivery_status"}, Value: gorm.Expr(
				"COALESCE(excluded.response_delivery_status, complaint_deliveries.response_delivery_status)")},
			{Column: clause.Column{Name: "updated_at"}, Value: now()},
		},
		Where: clause.Where{Exprs: []clause.Expression{clause.Expr{
			SQL: "complaint_deliveries.organization_id = excluded.organization_id",
		}}},
	}).Create(&models.ComplaintDelivery{
		ID:                     p.ID,
		OrganizationID:         p.OrganizationID,
		ComplaintID:            p.ComplaintID,
		ReceiptDeliveryStatus:  p.ReceiptDeliveryStatus,
		ResponseDeliveryStatus: p.ResponseDeliveryStatus,
	}).Error
}

type SetDocumentKeyParams struct {
	ComplaintID, OrganizationID, Workflow, Key string
}

// SetDocumentKey guarda la clave del PDF solo si aún no existe; devuelve false si otro
// proceso ya registró su documento.
func (r *Repository) SetDocumentKey(ctx context.Context, p SetDocumentKeyParams) (bool, error) {
	// solo se aceptan estos dos casos, así nadie puede mandar una columna inventada
	column := map[string]string{"receipt": "receipt_document_key", "response": "response_document_key"}[p.Workflow]
	if column == "" {
		return false, ErrNotFound
	}

	affected, err := rows(r.conn(ctx).Model(&models.ComplaintDelivery{}).
		Where("complaint_id = ? AND organization_id = ? AND "+column+" IS NULL", p.ComplaintID, p.OrganizationID).
		Updates(map[string]any{column: p.Key, "updated_at": now()}))

	return affected > 0, err
}

type SetEmailDeliveryParams struct {
	ComplaintID, OrganizationID, Workflow, Status, ErrorMessage string
}

// SetEmailDelivery registra el resultado del envío de la constancia o de la respuesta.
func (r *Repository) SetEmailDelivery(ctx context.Context, p SetEmailDeliveryParams) error {
	// igual que arriba: el prefijo sale de una lista fija
	prefix := map[string]string{"receipt": "receipt_delivery_", "response": "response_delivery_"}[p.Workflow]
	values := map[string]any{"updated_at": now()}

	if prefix != "" {
		values[prefix+"status"] = p.Status
		values[prefix+"error"] = nullable(p.ErrorMessage)

		// la fecha de envío solo se guarda si se envió bien
		if p.Status == "sent" {
			values[prefix+"sent_at"] = now()
		}
	}

	return r.conn(ctx).Model(&models.ComplaintDelivery{}).
		Where("complaint_id = ? AND organization_id = ?", p.ComplaintID, p.OrganizationID).
		Updates(values).Error
}
