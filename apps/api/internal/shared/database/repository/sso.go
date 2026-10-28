package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"openreclamos.com/api/internal/shared/database/models"
)

type SSOConnectionSummary struct {
	ID            string     `json:"id"`
	Protocol      string     `json:"protocol"`
	Name          string     `json:"name"`
	Status        string     `json:"status"`
	ConfigVersion int32      `json:"config_version"`
	TestedVersion *int32     `json:"tested_version"`
	TestedAt      *time.Time `json:"tested_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

func (r *Repository) ListSSOConnections(ctx context.Context, organizationID string) ([]SSOConnectionSummary, error) {
	out := []SSOConnectionSummary{}

	err := r.conn(ctx).Model(&models.SSOConnection{}).
		Select("id, protocol, name, status, config_version, tested_version, tested_at, created_at").
		Where("organization_id = ?", organizationID).Order("created_at").Find(&out).Error

	return out, err
}

type SSOConnectionDetails struct {
	models.SSOConnection
	OrganizationStatus string `json:"organization_status"`
}

func (r *Repository) GetSSOConnection(ctx context.Context, id string) (SSOConnectionDetails, error) {
	var c SSOConnectionDetails

	err := r.conn(ctx).Table("organization_sso_connections AS c").Select("c.*, o.status AS organization_status").
		Joins("JOIN organizations o ON o.id = c.organization_id").
		Where("c.id = ? AND o.deleted_at IS NULL", id).Take(&c).Error

	return c, err
}

func (r *Repository) GetSSOSettings(
	ctx context.Context,
	organizationID string,
) (models.OrganizationAuthSetting, error) {
	var s models.OrganizationAuthSetting
	err := r.conn(ctx).Where("organization_id = ?", organizationID).Take(&s).Error

	return s, err
}

type InsertSSOConnectionParams struct {
	ID, OrganizationID, Protocol, Name string
	CreatedBy                          *string
}

func (r *Repository) InsertSSOConnection(ctx context.Context, p InsertSSOConnectionParams) error {
	return r.conn(ctx).Create(&models.SSOConnection{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		Protocol:       p.Protocol,
		Name:           p.Name,
		Status:         "draft",
		ConfigVersion:  1,
		CreatedBy:      p.CreatedBy,
	}).Error
}

type UpdateSSOConnectionParams struct{ ID, OrganizationID, Name string }

// UpdateSSOConnection crea una nueva versión de la configuración y exige probarla otra vez.
func (r *Repository) UpdateSSOConnection(ctx context.Context, p UpdateSSOConnectionParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.SSOConnection{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Updates(map[string]any{
			"name":           p.Name,
			"config_version": gorm.Expr("config_version + 1"),
			"tested_version": nil,
			"tested_at":      nil,
			"updated_at":     now(),
		}))
}

type SaveOIDCConfigParams struct {
	ConnectionID, IssuerUrl, ClientID, ClientSecretEncrypted string
}

func (r *Repository) SaveOIDCConfig(ctx context.Context, p SaveOIDCConfigParams) error {
	return r.conn(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "connection_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"issuer_url", "client_id", "client_secret_encrypted"}),
	}).Create(&models.OIDCConfig{
		ConnectionID:          p.ConnectionID,
		IssuerUrl:             p.IssuerUrl,
		ClientID:              p.ClientID,
		ClientSecretEncrypted: p.ClientSecretEncrypted,
		Scopes:                models.DefaultOIDCScopes,
	}).Error
}

func (r *Repository) GetOIDCConfig(ctx context.Context, connectionID string) (models.OIDCConfig, error) {
	var c models.OIDCConfig
	err := r.conn(ctx).Where("connection_id = ?", connectionID).Take(&c).Error

	return c, err
}

type SaveSAMLConfigParams struct {
	ConnectionID, IdpMetadataXml, IdpEntityID, SpCertificate, SpPrivateKeyEncrypted string
	SubjectAttribute                                                                *string
	EmailAttribute, NameAttribute                                                   string
}

func (r *Repository) SaveSAMLConfig(ctx context.Context, p SaveSAMLConfigParams) error {
	return r.conn(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "connection_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"idp_metadata_xml", "idp_entity_id", "sp_certificate", "sp_private_key_encrypted",
			"subject_attribute", "email_attribute", "name_attribute",
		}),
	}).Create(&models.SAMLConfig{
		ConnectionID:          p.ConnectionID,
		IdpMetadataXml:        p.IdpMetadataXml,
		IdpEntityID:           p.IdpEntityID,
		SpCertificate:         p.SpCertificate,
		SpPrivateKeyEncrypted: p.SpPrivateKeyEncrypted,
		SubjectAttribute:      p.SubjectAttribute,
		EmailAttribute:        p.EmailAttribute,
		NameAttribute:         p.NameAttribute,
	}).Error
}

func (r *Repository) GetSAMLConfig(ctx context.Context, connectionID string) (models.SAMLConfig, error) {
	var c models.SAMLConfig
	err := r.conn(ctx).Where("connection_id = ?", connectionID).Take(&c).Error

	return c, err
}

type SetSSOPolicyParams struct{ OrganizationID, LoginMode, ConnectionID string }

// SetSSOPolicy incrementa la versión de política, lo que invalida los grants SSO previos.
func (r *Repository) SetSSOPolicy(ctx context.Context, p SetSSOPolicyParams) (models.OrganizationAuthSetting, error) {
	result := r.conn(ctx).Model(&models.OrganizationAuthSetting{}).
		Where("organization_id = ?", p.OrganizationID).
		Updates(map[string]any{
			"login_mode":           p.LoginMode,
			"active_connection_id": nullable(p.ConnectionID),
			"policy_version":       gorm.Expr("policy_version + 1"),
		})

	if err := updated(result); err != nil {
		return models.OrganizationAuthSetting{}, err
	}

	return r.GetSSOSettings(ctx, p.OrganizationID)
}

type SetConnectionActiveParams struct{ ID, OrganizationID, Status string }

func (r *Repository) SetConnectionActive(ctx context.Context, p SetConnectionActiveParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.SSOConnection{}).
		Where("id = ? AND organization_id = ?", p.ID, p.OrganizationID).
		Update("status", p.Status))
}

type MarkSSOTestedParams struct {
	ID, OrganizationID string
	ConfigVersion      int32
}

// MarkSSOTested solo marca la versión probada si la configuración no cambió entretanto.
func (r *Repository) MarkSSOTested(ctx context.Context, p MarkSSOTestedParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.SSOConnection{}).
		Where("id = ? AND organization_id = ? AND config_version = ?", p.ID, p.OrganizationID, p.ConfigVersion).
		Updates(map[string]any{"tested_version": gorm.Expr("config_version"), "tested_at": now()}))
}

type InsertSSOAttemptParams struct {
	ID, OrganizationID, ConnectionID            string
	ConfigVersion                               int32
	Purpose, UserID, StateHash, BrowserHash     string
	Nonce, PkceVerifierEncrypted, SamlRequestID *string
	ExpiresAt                                   time.Time
}

func (r *Repository) InsertSSOAttempt(ctx context.Context, p InsertSSOAttemptParams) error {
	return r.conn(ctx).Create(&models.SSOLoginAttempt{
		ID:                    p.ID,
		OrganizationID:        p.OrganizationID,
		ConnectionID:          p.ConnectionID,
		ConfigVersion:         p.ConfigVersion,
		Purpose:               p.Purpose,
		UserID:                nullable(p.UserID),
		StateHash:             p.StateHash,
		BrowserHash:           p.BrowserHash,
		Nonce:                 p.Nonce,
		PkceVerifierEncrypted: p.PkceVerifierEncrypted,
		SamlRequestID:         p.SamlRequestID,
		ExpiresAt:             p.ExpiresAt.UTC(),
	}).Error
}

type ConsumeSSOAttemptParams struct{ StateHash, ConnectionID, BrowserHash string }

// ConsumeSSOAttempt marca el intento como usado; un segundo consumo no encuentra filas.
func (r *Repository) ConsumeSSOAttempt(ctx context.Context, p ConsumeSSOAttemptParams) (models.SSOLoginAttempt, error) {
	at := now()

	result := r.conn(ctx).Model(&models.SSOLoginAttempt{}).
		Where("state_hash = ? AND connection_id = ? AND browser_hash = ?", p.StateHash, p.ConnectionID, p.BrowserHash).
		Where("expires_at > ? AND consumed_at IS NULL", at).
		Update("consumed_at", at)

	if err := updated(result); err != nil {
		return models.SSOLoginAttempt{}, err
	}

	var attempt models.SSOLoginAttempt
	err := r.conn(ctx).Where("state_hash = ?", p.StateHash).Take(&attempt).Error

	return attempt, err
}

type SetAssertionIDParams struct {
	ID          string
	AssertionID *string
}

// SetAssertionID falla con un duplicado si la aserción SAML ya se usó (protección de replay).
func (r *Repository) SetAssertionID(ctx context.Context, p SetAssertionIDParams) error {
	return r.conn(ctx).Model(&models.SSOLoginAttempt{}).Where("id = ?", p.ID).
		Update("assertion_id", p.AssertionID).Error
}

type FindSSOIdentityParams struct{ ConnectionID, Issuer, Subject string }

func (r *Repository) FindSSOIdentity(ctx context.Context, p FindSSOIdentityParams) (models.UserSSOIdentity, error) {
	var identity models.UserSSOIdentity

	err := r.conn(ctx).Where("connection_id = ? AND issuer = ? AND subject = ?", p.ConnectionID, p.Issuer, p.Subject).
		Take(&identity).Error

	return identity, err
}

type LinkSSOIdentityParams struct {
	ID, OrganizationID, ConnectionID, UserID, Issuer, Subject string
}

// LinkSSOIdentity vincula la identidad o renueva su último acceso; nunca la transfiere a
// otro usuario (devuelve 0 filas en ese caso).
func (r *Repository) LinkSSOIdentity(ctx context.Context, p LinkSSOIdentityParams) (int64, error) {
	at := now()

	return rows(r.conn(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "connection_id"}, {Name: "issuer"}, {Name: "subject"}},
		DoUpdates: clause.Set{{Column: clause.Column{Name: "last_login_at"}, Value: at}},
		Where: clause.Where{Exprs: []clause.Expression{clause.Expr{
			SQL: "user_sso_identities.user_id = excluded.user_id",
		}}},
	}).Create(&models.UserSSOIdentity{
		ID:             p.ID,
		OrganizationID: p.OrganizationID,
		ConnectionID:   p.ConnectionID,
		UserID:         p.UserID,
		Issuer:         p.Issuer,
		Subject:        p.Subject,
		LastLoginAt:    &at,
	}))
}
