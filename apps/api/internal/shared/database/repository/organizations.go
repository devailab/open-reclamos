package repository

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database/models"
)

type Membership struct {
	models.OrganizationMember
	Role               string  `json:"role"`
	Status             string  `json:"status"`
	LoginMode          string  `json:"login_mode"`
	PolicyVersion      int32   `json:"policy_version"`
	ActiveConnectionID *string `json:"active_connection_id"`
}

type GetMembershipParams struct{ UserID, OrganizationID string }

func (r *Repository) GetMembership(ctx context.Context, p GetMembershipParams) (Membership, error) {
	var m Membership

	err := r.conn(ctx).Table("organization_members AS m").
		Select("m.*, r.key AS role, o.status, a.login_mode, a.policy_version, a.active_connection_id").
		Joins("JOIN roles r ON r.id = m.role_id").
		Joins("JOIN organizations o ON o.id = m.organization_id").
		Joins("JOIN organization_auth_settings a ON a.organization_id = m.organization_id").
		Where("m.user_id = ? AND m.organization_id = ? AND o.deleted_at IS NULL", p.UserID, p.OrganizationID).
		Take(&m).Error

	return m, err
}

type GetAssignedStoresParams struct{ UserID, OrganizationID string }

func (r *Repository) GetAssignedStores(ctx context.Context, p GetAssignedStoresParams) ([]string, error) {
	ids := []string{}

	err := r.conn(ctx).Table("organization_member_stores AS ms").
		Joins("JOIN stores s ON s.id = ms.store_id AND s.organization_id = ms.organization_id").
		Where("ms.user_id = ? AND ms.organization_id = ?", p.UserID, p.OrganizationID).
		Pluck("ms.store_id", &ids).Error

	return ids, err
}

func (r *Repository) OrganizationSlugExists(ctx context.Context, slug string) (bool, error) {
	return r.exists(ctx, &models.Organization{}, "slug = ?", slug)
}

func (r *Repository) StoreSlugExists(ctx context.Context, slug string) (bool, error) {
	return r.exists(ctx, &models.Store{}, "slug = ?", slug)
}

func (r *Repository) OrganizationSlugInUse(ctx context.Context, slug, excludeID string) (bool, error) {
	if excludeID == "" {
		return r.OrganizationSlugExists(ctx, slug)
	}

	return r.exists(ctx, &models.Organization{}, "slug = ? AND id <> ?", slug, excludeID)
}

func (r *Repository) StoreSlugInUse(ctx context.Context, slug, excludeID string) (bool, error) {
	if excludeID == "" {
		return r.StoreSlugExists(ctx, slug)
	}

	return r.exists(ctx, &models.Store{}, "slug = ? AND id <> ?", slug, excludeID)
}

// revisa si existe al menos una fila con esa condición
func (r *Repository) exists(ctx context.Context, model any, query string, args ...any) (bool, error) {
	var n int64
	err := r.conn(ctx).Model(model).Where(query, args...).Limit(1).Count(&n).Error

	return n > 0, err
}

type PlatformOverview struct {
	Organizations int64 `json:"organizations"`
	Suspended     int64 `json:"suspended"`
	Users         int64 `json:"users"`
	Stores        int64 `json:"stores"`
	Complaints    int64 `json:"complaints"`
}

func (r *Repository) PlatformOverview(ctx context.Context) (PlatformOverview, error) {
	var out PlatformOverview

	// cada número se cuenta con su propia consulta
	counts := []struct {
		target *int64
		query  *gorm.DB
	}{
		{&out.Organizations, r.conn(ctx).Model(&models.Organization{})},
		{&out.Suspended, r.conn(ctx).Model(&models.Organization{}).Where("status = ?", "suspended")},
		{&out.Users, r.conn(ctx).Model(&models.User{})},
		{&out.Stores, r.conn(ctx).Model(&models.Store{}).Where("deleted_at IS NULL")},
		{&out.Complaints, r.conn(ctx).Model(&models.Complaint{})},
	}

	for _, c := range counts {
		if err := c.query.Count(c.target).Error; err != nil {
			return out, err
		}
	}

	return out, nil
}

type OrganizationWithRole struct {
	models.Organization
	Role string `json:"role"`
}

func (r *Repository) ListOrganizations(ctx context.Context, userID string) ([]OrganizationWithRole, error) {
	out := []OrganizationWithRole{}

	err := r.conn(ctx).Table("organizations AS o").Select("o.*, r.key AS role").
		Joins("JOIN organization_members m ON m.organization_id = o.id").
		Joins("JOIN roles r ON r.id = m.role_id").
		Where("m.user_id = ? AND o.deleted_at IS NULL", userID).
		Order("o.created_at, o.id").Find(&out).Error

	return out, err
}

type CreateOrganizationParams struct {
	ID, UbigeoID, Slug, Name, LegalName, TaxID, AddressType, Address string
	PhoneCode, Phone, Website                                        string
	CreatedBy                                                        *string
}

// si el dato viene vacío, se guarda como null
func (r *Repository) CreateOrganization(ctx context.Context, p CreateOrganizationParams) (models.Organization, error) {
	o := models.Organization{
		ID:          p.ID,
		UbigeoID:    p.UbigeoID,
		Slug:        p.Slug,
		Name:        p.Name,
		LegalName:   p.LegalName,
		TaxID:       p.TaxID,
		AddressType: p.AddressType,
		Address:     p.Address,
		PhoneCode:   nullable(p.PhoneCode),
		Phone:       nullable(p.Phone),
		Website:     nullable(p.Website),
		Status:      "active",
		CreatedBy:   p.CreatedBy,
	}

	return o, r.conn(ctx).Create(&o).Error
}

func (r *Repository) GetOrganization(ctx context.Context, id string) (models.Organization, error) {
	var o models.Organization
	err := r.conn(ctx).Where("id = ? AND deleted_at IS NULL", id).Take(&o).Error

	return o, err
}

type UpdateOrganizationParams struct {
	ID, Name, LegalName, UbigeoID, AddressType, Address string
	PhoneCode, Phone, Website, PrimaryColor             string
	UpdatedBy                                           *string
	BusinessDomain                                      *string
	Slug                                                *string
}

// da error si la empresa no existe; si se actualiza, devuelve los datos nuevos
func (r *Repository) UpdateOrganization(ctx context.Context, p UpdateOrganizationParams) (models.Organization, error) {
	changes := map[string]any{
		"name":          p.Name,
		"legal_name":    p.LegalName,
		"ubigeo_id":     p.UbigeoID,
		"address_type":  p.AddressType,
		"address":       p.Address,
		"phone_code":    nullable(p.PhoneCode),
		"phone":         nullable(p.Phone),
		"website":       nullable(p.Website),
		"primary_color": nullable(p.PrimaryColor),
		"updated_at":    now(),
		"updated_by":    p.UpdatedBy,
	}

	if p.BusinessDomain != nil {
		changes["business_domain"] = nullable(*p.BusinessDomain)
	}

	if p.Slug != nil {
		changes["slug"] = *p.Slug
	}

	result := r.conn(ctx).Model(&models.Organization{}).Where("id = ? AND deleted_at IS NULL", p.ID).Updates(changes)

	if err := updated(result); err != nil {
		return models.Organization{}, err
	}

	return r.GetOrganization(ctx, p.ID)
}

func (r *Repository) BusinessDomainInUse(ctx context.Context, domain, excludeID string) (bool, error) {
	var count int64

	err := r.conn(ctx).Model(&models.Organization{}).
		Where("lower(business_domain) = ? AND id <> ? AND deleted_at IS NULL", domain, excludeID).
		Count(&count).Error

	return count > 0, err
}

func (r *Repository) GetOrganizationByBusinessDomain(ctx context.Context, domain string) (models.Organization, error) {
	var organization models.Organization

	err := r.conn(ctx).Where("business_domain = ? AND status = ? AND deleted_at IS NULL", domain, "active").
		Take(&organization).Error

	return organization, err
}

type CreateMemberParams struct {
	UserID, OrganizationID, Role, StoreAccessMode string
	CreatedBy                                     *string
}

// busca el id del rol antes de crear el miembro
func (r *Repository) CreateMember(ctx context.Context, p CreateMemberParams) error {
	roleID, err := r.roleID(ctx, p.Role)
	if err != nil {
		return err
	}

	return r.conn(ctx).Create(&models.OrganizationMember{
		UserID:          p.UserID,
		OrganizationID:  p.OrganizationID,
		RoleID:          roleID,
		StoreAccessMode: p.StoreAccessMode,
		CreatedBy:       p.CreatedBy,
	}).Error
}

func (r *Repository) roleID(ctx context.Context, key string) (string, error) {
	var role models.Role
	err := r.conn(ctx).Select("id").Where("key = ?", key).Take(&role).Error

	return role.ID, err
}

type CreateSettingsParams struct {
	ID, OrganizationID string
	CreatedBy          *string
}

func (r *Repository) CreateSettings(ctx context.Context, p CreateSettingsParams) error {
	return r.conn(ctx).Create(&models.OrganizationSetting{
		ID:                   p.ID,
		OrganizationID:       p.OrganizationID,
		ResponseDeadlineDays: 15,
		FormEnabled:          true,
		CreatedBy:            p.CreatedBy,
	}).Error
}

func (r *Repository) CreateAuthSettings(ctx context.Context, organizationID string) error {
	return r.conn(ctx).Create(&models.OrganizationAuthSetting{
		OrganizationID: organizationID,
		LoginMode:      "local",
		PolicyVersion:  1,
	}).Error
}

func (r *Repository) GetSettings(ctx context.Context, organizationID string) (models.OrganizationSetting, error) {
	var s models.OrganizationSetting
	err := r.conn(ctx).Where("organization_id = ?", organizationID).Take(&s).Error

	return s, err
}

type UpdateSettingsParams struct {
	OrganizationID       string
	ResponseDeadlineDays int32
	FormEnabled          bool
	McpEnabledTools      models.JSON
	McpShowSensitiveData bool
	UpdatedBy            *string
}

func (r *Repository) UpdateSettings(ctx context.Context, p UpdateSettingsParams) (models.OrganizationSetting, error) {
	result := r.conn(ctx).Model(&models.OrganizationSetting{}).Where("organization_id = ?", p.OrganizationID).
		Updates(map[string]any{
			"response_deadline_days":  p.ResponseDeadlineDays,
			"form_enabled":            p.FormEnabled,
			"mcp_enabled_tools":       p.McpEnabledTools,
			"mcp_show_sensitive_data": p.McpShowSensitiveData,
			"updated_by":              p.UpdatedBy,
			"updated_at":              now(),
		})

	if err := updated(result); err != nil {
		return models.OrganizationSetting{}, err
	}

	return r.GetSettings(ctx, p.OrganizationID)
}

type SetLogoParams struct {
	ID, LogoKey string
	UpdatedBy   *string
}

func (r *Repository) SetLogo(ctx context.Context, p SetLogoParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Organization{}).Where("id = ?", p.ID).Updates(map[string]any{
		"logo_key":   nullable(p.LogoKey),
		"updated_at": now(),
		"updated_by": p.UpdatedBy,
	}))
}

type MemberSummary struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	LastName        string    `json:"last_name"`
	Email           string    `json:"email"`
	Active          bool      `json:"active"`
	Role            string    `json:"role"`
	StoreAccessMode string    `json:"store_access_mode"`
	CreatedAt       time.Time `json:"created_at"`
}

func (r *Repository) ListUsers(ctx context.Context, organizationID string) ([]MemberSummary, error) {
	out := []MemberSummary{}

	err := r.conn(ctx).Table("organization_members AS m").
		Select("u.id, u.name, u.last_name, u.email, u.active, r.key AS role, m.store_access_mode, m.created_at").
		Joins("JOIN users u ON u.id = m.user_id").
		Joins("JOIN roles r ON r.id = m.role_id").
		Where("m.organization_id = ?", organizationID).
		Order("u.name, u.id").Find(&out).Error

	return out, err
}

// LockOrganization serializa los cambios sensibles de una empresa (admins, SSO, motivos).
func (r *Repository) LockOrganization(ctx context.Context, id string) (string, error) {
	var o models.Organization
	err := forUpdate(r.conn(ctx)).Select("id").Where("id = ?", id).Take(&o).Error

	return o.ID, err
}

// se usa para no dejar la empresa sin administradores
func (r *Repository) CountAdmins(ctx context.Context, organizationID string) (int64, error) {
	var n int64

	err := r.conn(ctx).Table("organization_members AS m").
		Joins("JOIN roles r ON r.id = m.role_id").
		Where("m.organization_id = ? AND r.key = ?", organizationID, "admin").
		Count(&n).Error

	return n, err
}

type UpdateMemberParams struct {
	OrganizationID, UserID, Role, StoreAccessMode string
	UpdatedBy                                     *string
}

func (r *Repository) UpdateMember(ctx context.Context, p UpdateMemberParams) (int64, error) {
	roleID, err := r.roleID(ctx, p.Role)
	if err != nil {
		return 0, err
	}

	return rows(r.conn(ctx).Model(&models.OrganizationMember{}).
		Where("organization_id = ? AND user_id = ?", p.OrganizationID, p.UserID).
		Updates(map[string]any{
			"role_id":           roleID,
			"store_access_mode": p.StoreAccessMode,
			"updated_at":        now(),
			"updated_by":        p.UpdatedBy,
		}))
}

type DeleteMemberParams struct{ OrganizationID, UserID string }

func (r *Repository) DeleteMember(ctx context.Context, p DeleteMemberParams) (int64, error) {
	return rows(r.conn(ctx).Where("organization_id = ? AND user_id = ?", p.OrganizationID, p.UserID).
		Delete(&models.OrganizationMember{}))
}

type ClearMemberStoresParams struct{ OrganizationID, UserID string }

func (r *Repository) ClearMemberStores(ctx context.Context, p ClearMemberStoresParams) error {
	return r.conn(ctx).Where("organization_id = ? AND user_id = ?", p.OrganizationID, p.UserID).
		Delete(&models.OrganizationMemberStore{}).Error
}

type AssignStoreParams struct {
	UserID, OrganizationID, StoreID string
	CreatedBy                       *string
}

func (r *Repository) AssignStore(ctx context.Context, p AssignStoreParams) error {
	return r.conn(ctx).Create(&models.OrganizationMemberStore{
		UserID:         p.UserID,
		OrganizationID: p.OrganizationID,
		StoreID:        p.StoreID,
		CreatedBy:      p.CreatedBy,
	}).Error
}

func (r *Repository) ListRoles(ctx context.Context) ([]models.Role, error) {
	out := []models.Role{}
	err := r.conn(ctx).Order("key").Find(&out).Error

	return out, err
}

type PlatformOrganization struct {
	models.Organization
	StoresCount int64 `json:"stores_count"`
}

func (r *Repository) ListPlatformOrganizations(ctx context.Context) ([]PlatformOrganization, error) {
	out := []PlatformOrganization{}

	err := r.conn(ctx).Table("organizations AS o").
		Select("o.*, (SELECT count(*) FROM stores s WHERE s.organization_id = o.id AND s.deleted_at IS NULL) AS stores_count").
		Order("o.created_at DESC").Find(&out).Error

	return out, err
}

type SetOrganizationStatusParams struct {
	ID, Status       string
	SuspendedBy      *string
	SuspensionReason *string
}

// la fecha solo se guarda al suspender; al reactivar queda en null
func (r *Repository) SetOrganizationStatus(
	ctx context.Context,
	p SetOrganizationStatusParams,
) (models.Organization, error) {
	var suspendedAt *time.Time

	if p.Status == "suspended" {
		at := now()
		suspendedAt = &at
	}

	result := r.conn(ctx).Model(&models.Organization{}).Where("id = ?", p.ID).Updates(map[string]any{
		"status":            p.Status,
		"suspended_at":      suspendedAt,
		"suspended_by":      p.SuspendedBy,
		"suspension_reason": p.SuspensionReason,
	})

	if err := updated(result); err != nil {
		return models.Organization{}, err
	}

	return r.GetOrganization(ctx, p.ID)
}

type CreateInvitationParams struct {
	ID, OrganizationID, Role, Email, TokenHash, StoreAccessMode string
	ExpiresAt                                                   time.Time
	CreatedBy                                                   *string
}

// el correo va en minúsculas y solo se guarda el hash del token
func (r *Repository) CreateInvitation(ctx context.Context, p CreateInvitationParams) error {
	roleID, err := r.roleID(ctx, p.Role)
	if err != nil {
		return err
	}

	return r.conn(ctx).Create(&models.OrganizationInvitation{
		ID:              p.ID,
		OrganizationID:  p.OrganizationID,
		RoleID:          roleID,
		Email:           strings.ToLower(p.Email),
		TokenHash:       p.TokenHash,
		StoreAccessMode: p.StoreAccessMode,
		ExpiresAt:       p.ExpiresAt.UTC(),
		CreatedBy:       p.CreatedBy,
	}).Error
}

type AssignInvitationStoreParams struct{ InvitationID, OrganizationID, StoreID string }

func (r *Repository) AssignInvitationStore(ctx context.Context, p AssignInvitationStoreParams) error {
	return r.conn(ctx).Create(&models.OrganizationInvitationStore{
		InvitationID:   p.InvitationID,
		OrganizationID: p.OrganizationID,
		StoreID:        p.StoreID,
	}).Error
}

type InvitationSummary struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	StoreAccessMode string     `json:"store_access_mode"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at"`
	RevokedAt       *time.Time `json:"revoked_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (r *Repository) ListInvitations(ctx context.Context, organizationID string) ([]InvitationSummary, error) {
	out := []InvitationSummary{}

	err := r.conn(ctx).Table("organization_invitations AS i").
		Select("i.id, i.email, r.key AS role, i.store_access_mode, i.expires_at, i.accepted_at, i.revoked_at, i.created_at").
		Joins("JOIN roles r ON r.id = i.role_id").
		Where("i.organization_id = ?", organizationID).
		Order("i.created_at DESC").Find(&out).Error

	return out, err
}

type InvitationDetails struct {
	models.OrganizationInvitation
	Role             string `json:"role"`
	OrganizationName string `json:"organization_name"`
	Status           string `json:"status"`
	LoginMode        string `json:"login_mode"`
}

func (r *Repository) GetInvitationByToken(ctx context.Context, tokenHash string) (InvitationDetails, error) {
	var i InvitationDetails

	err := r.conn(ctx).Table("organization_invitations AS i").
		Select("i.*, r.key AS role, o.name AS organization_name, o.status, a.login_mode").
		Joins("JOIN roles r ON r.id = i.role_id").
		Joins("JOIN organizations o ON o.id = i.organization_id").
		Joins("JOIN organization_auth_settings a ON a.organization_id = i.organization_id").
		Where("i.token_hash = ?", tokenHash).
		Take(&i).Error

	return i, err
}

type LockInvitationParams struct{ ID, TokenHash string }

// bloquea la invitación solo si sigue activa: no aceptada, no revocada y no vencida
func (r *Repository) LockInvitation(ctx context.Context, p LockInvitationParams) (string, error) {
	var i models.OrganizationInvitation

	err := forUpdate(r.conn(ctx)).Select("id").
		Where("id = ? AND token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
			p.ID, p.TokenHash, now()).
		Take(&i).Error

	return i.ID, err
}

type PendingInvitation struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	OrganizationName string `json:"organization_name"`
}

type GetPendingInvitationParams struct{ ID, OrganizationID string }

func (r *Repository) GetPendingInvitation(
	ctx context.Context,
	p GetPendingInvitationParams,
) (PendingInvitation, error) {
	var i PendingInvitation

	err := r.conn(ctx).Table("organization_invitations AS i").
		Select("i.id, i.email, o.name AS organization_name").
		Joins("JOIN organizations o ON o.id = i.organization_id").
		Where("i.id = ? AND i.organization_id = ? AND i.accepted_at IS NULL AND i.revoked_at IS NULL",
			p.ID, p.OrganizationID).
		Take(&i).Error

	return i, err
}

type RotateInvitationParams struct {
	ID, OrganizationID, TokenHash string
	ExpiresAt                     time.Time
}

// cambia el token y la fecha de vencimiento de una invitación pendiente
func (r *Repository) RotateInvitation(ctx context.Context, p RotateInvitationParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.OrganizationInvitation{}).
		Where("id = ? AND organization_id = ? AND accepted_at IS NULL AND revoked_at IS NULL", p.ID, p.OrganizationID).
		Updates(map[string]any{"token_hash": p.TokenHash, "expires_at": p.ExpiresAt.UTC()}))
}

type AcceptInvitationParams struct {
	ID         string
	AcceptedBy *string
}

// la acepta solo si sigue pendiente y no ha vencido
func (r *Repository) AcceptInvitation(ctx context.Context, p AcceptInvitationParams) (int64, error) {
	at := now()

	return rows(r.conn(ctx).Model(&models.OrganizationInvitation{}).
		Where("id = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?", p.ID, at).
		Updates(map[string]any{"accepted_at": at, "accepted_by": p.AcceptedBy}))
}

type CopyInvitationStoresParams struct{ UserID, InvitationID string }

// CopyInvitationStores concede al nuevo miembro las tiendas elegidas en la invitación.
func (r *Repository) CopyInvitationStores(ctx context.Context, p CopyInvitationStoresParams) error {
	var stores []models.OrganizationInvitationStore

	if err := r.conn(ctx).Where("invitation_id = ?", p.InvitationID).Find(&stores).Error; err != nil {
		return err
	}

	if len(stores) == 0 {
		return nil
	}

	assigned := make([]models.OrganizationMemberStore, len(stores))

	for i, store := range stores {
		assigned[i] = models.OrganizationMemberStore{
			UserID:         p.UserID,
			OrganizationID: store.OrganizationID,
			StoreID:        store.StoreID,
		}
	}

	return r.conn(ctx).Create(&assigned).Error
}

type RevokeInvitationParams struct {
	ID, OrganizationID string
	RevokedBy          *string
}

// una invitación ya aceptada no se puede revocar
func (r *Repository) RevokeInvitation(ctx context.Context, p RevokeInvitationParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.OrganizationInvitation{}).
		Where("id = ? AND organization_id = ? AND accepted_at IS NULL", p.ID, p.OrganizationID).
		Updates(map[string]any{"revoked_at": now(), "revoked_by": p.RevokedBy}))
}
