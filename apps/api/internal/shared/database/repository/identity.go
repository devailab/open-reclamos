package repository

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"openreclamos.com/api/internal/shared/database/models"
)

type UserWithPassword struct {
	models.User
	Password *string `json:"password"`
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (UserWithPassword, error) {
	var u UserWithPassword

	err := r.conn(ctx).Table("users AS u").Select("u.*, a.password").
		Joins("LEFT JOIN accounts a ON a.user_id = u.id AND a.provider_id = ?", models.CredentialProvider).
		Where("lower(u.email) = lower(?)", email).
		Take(&u).Error

	return u, err
}

type CreateUserParams struct {
	ID, Name, Email              string
	LastName                     string
	DocumentType, DocumentNumber string
	IsSuperAdmin, EmailVerified  bool
}

func (r *Repository) CreateUser(ctx context.Context, p CreateUserParams) (models.User, error) {
	u := models.User{
		ID:             p.ID,
		Name:           p.Name,
		LastName:       p.LastName,
		Email:          strings.ToLower(p.Email),
		EmailVerified:  p.EmailVerified,
		DocumentType:   p.DocumentType,
		DocumentNumber: p.DocumentNumber,
		SetupStatus:    "complete",
		IsSuperAdmin:   p.IsSuperAdmin,
		Active:         true,
	}

	return u, r.conn(ctx).Create(&u).Error
}

// DocumentInUse indica si otra cuenta ya registró el mismo tipo y número de documento.
// La unicidad se valida aquí, dentro de la transacción con BootstrapLock, y no en la DB.
func (r *Repository) DocumentInUse(ctx context.Context, documentType, documentNumber string) (bool, error) {
	var n int64

	err := r.conn(ctx).Model(&models.User{}).
		Where("document_type = ? AND document_number = ?", documentType, documentNumber).
		Count(&n).Error

	return n > 0, err
}

// SaveEmailVerification reemplaza el código vigente del usuario y reinicia sus intentos.
func (r *Repository) SaveEmailVerification(ctx context.Context, v models.EmailVerification) error {
	return r.conn(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"code_hash", "attempts", "expires_at", "sent_at"}),
	}).Create(&v).Error
}

func (r *Repository) GetEmailVerification(ctx context.Context, userID string) (models.EmailVerification, error) {
	var v models.EmailVerification
	err := r.conn(ctx).Where("user_id = ?", userID).Take(&v).Error

	return v, err
}

// UseEmailVerificationAttempt consume un intento del código vigente. Devuelve false si
// venció o agotó sus intentos; al ser un solo UPDATE, solicitudes concurrentes no
// pueden superar el máximo.
func (r *Repository) UseEmailVerificationAttempt(ctx context.Context, userID string, maxAttempts int) (bool, error) {
	affected, err := rows(r.conn(ctx).Model(&models.EmailVerification{}).
		Where("user_id = ? AND attempts < ? AND expires_at > ?", userID, maxAttempts, now()).
		UpdateColumn("attempts", gorm.Expr("attempts + 1")))

	return affected > 0, err
}

// DeleteEmailVerification descarta el código, por ejemplo si no se pudo enviar.
func (r *Repository) DeleteEmailVerification(ctx context.Context, userID string) error {
	return r.conn(ctx).Where("user_id = ?", userID).Delete(&models.EmailVerification{}).Error
}

// CompleteEmailVerification marca el email como verificado y descarta el código.
func (r *Repository) CompleteEmailVerification(ctx context.Context, userID string) error {
	if err := updated(r.conn(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]any{"email_verified": true, "updated_at": now()})); err != nil {
		return err
	}

	return r.DeleteEmailVerification(ctx, userID)
}

type CreateCredentialParams struct {
	ID, AccountID, UserID string
	Password              *string
}

func (r *Repository) CreateCredential(ctx context.Context, p CreateCredentialParams) error {
	return r.conn(ctx).Create(&models.Account{
		ID:         p.ID,
		AccountID:  p.AccountID,
		ProviderID: models.CredentialProvider,
		UserID:     p.UserID,
		Password:   p.Password,
	}).Error
}

type Profile struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	IsSuperAdmin bool   `json:"is_super_admin"`
}

type UpdateProfileParams struct{ ID, Name, LastName string }

func (r *Repository) UpdateProfile(ctx context.Context, p UpdateProfileParams) (Profile, error) {
	var out Profile

	result := r.conn(ctx).Model(&models.User{}).Where("id = ? AND active = ?", p.ID, true).
		Updates(map[string]any{"name": p.Name, "last_name": p.LastName, "updated_at": now()})

	if err := updated(result); err != nil {
		return out, err
	}

	err := r.conn(ctx).Model(&models.User{}).Select("id, name, last_name, email, is_super_admin").
		Where("id = ?", p.ID).Take(&out).Error

	return out, err
}

type UpdatePasswordParams struct {
	UserID   string
	Password *string
}

func (r *Repository) UpdatePassword(ctx context.Context, p UpdatePasswordParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.Account{}).
		Where("user_id = ? AND provider_id = ?", p.UserID, models.CredentialProvider).
		Updates(map[string]any{"password": p.Password, "updated_at": now()}))
}

// obtiene el hash de la contraseña local del usuario.
func (r *Repository) GetCredentialPassword(ctx context.Context, userID string) (*string, error) {
	var account models.Account

	err := r.conn(ctx).Select("password").
		Where("user_id = ? AND provider_id = ?", userID, models.CredentialProvider).
		Take(&account).Error

	return account.Password, err
}

// LockCredential bloquea la credencial local hasta el fin de la transacción.
func (r *Repository) LockCredential(ctx context.Context, userID string) (*string, error) {
	var account models.Account

	err := forUpdate(r.conn(ctx)).Select("password").
		Where("user_id = ? AND provider_id = ?", userID, models.CredentialProvider).
		Take(&account).Error

	return account.Password, err
}

func (r *Repository) CountUsers(ctx context.Context) (int64, error) {
	var n int64
	err := r.conn(ctx).Model(&models.User{}).Count(&n).Error

	return n, err
}

func (r *Repository) BootstrapLock(ctx context.Context) error { return r.bootstrapLock() }

type UserSummary struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	IsSuperAdmin bool   `json:"is_super_admin"`
	Active       bool   `json:"active"`
}

func (r *Repository) GetUser(ctx context.Context, id string) (UserSummary, error) {
	var u UserSummary

	err := r.conn(ctx).Model(&models.User{}).Select("id, name, last_name, email, is_super_admin, active").
		Where("id = ?", id).Take(&u).Error

	return u, err
}

type CreateAPIKeyParams struct{ ID, UserID, OrganizationID, TokenHash, Name string }

func (r *Repository) CreateAPIKey(ctx context.Context, p CreateAPIKeyParams) error {
	return r.conn(ctx).Create(&models.APIKey{
		ID:             p.ID,
		UserID:         p.UserID,
		OrganizationID: p.OrganizationID,
		TokenHash:      p.TokenHash,
		Name:           p.Name,
	}).Error
}

type APIKeySummary struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"created_at"`
	RevokedAt *time.Time `json:"revoked_at"`
}

type ListAPIKeysParams struct{ UserID, OrganizationID string }

func (r *Repository) ListAPIKeys(ctx context.Context, p ListAPIKeysParams) ([]APIKeySummary, error) {
	out := []APIKeySummary{}

	err := r.conn(ctx).Model(&models.APIKey{}).Select("id, name, created_at, revoked_at").
		Where("user_id = ? AND organization_id = ?", p.UserID, p.OrganizationID).
		Order("created_at DESC").Find(&out).Error

	return out, err
}

type RevokeAPIKeyParams struct{ ID, UserID, OrganizationID string }

func (r *Repository) RevokeAPIKey(ctx context.Context, p RevokeAPIKeyParams) (int64, error) {
	return rows(r.conn(ctx).Model(&models.APIKey{}).
		Where("id = ? AND user_id = ? AND organization_id = ?", p.ID, p.UserID, p.OrganizationID).
		Update("revoked_at", now()))
}

type ResolvedAPIKey struct {
	UserID         string `json:"user_id"`
	OrganizationID string `json:"organization_id"`
}

func (r *Repository) ResolveAPIKey(ctx context.Context, tokenHash string) (ResolvedAPIKey, error) {
	var key ResolvedAPIKey

	err := r.conn(ctx).Model(&models.APIKey{}).Select("user_id, organization_id").
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).Take(&key).Error

	return key, err
}
