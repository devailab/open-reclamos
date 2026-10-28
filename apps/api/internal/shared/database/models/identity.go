// Package models define las filas que el backend lee y escribe con GORM. Las etiquetas
// json conservan los nombres de columna porque forman parte del contrato de la API.
package models

import "time"

type User struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	LastName       string    `json:"last_name"`
	Email          string    `json:"email"`
	EmailVerified  bool      `json:"email_verified"`
	DocumentType   string    `json:"document_type"`
	DocumentNumber string    `json:"document_number"`
	Image          *string   `json:"image"`
	SetupStatus    string    `json:"setup_status"`
	IsSuperAdmin   bool      `json:"is_super_admin"`
	Active         bool      `json:"active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (User) TableName() string { return "users" }

type EmailVerification struct {
	UserID    string    `json:"user_id"`
	CodeHash  string    `json:"code_hash"`
	Attempts  int       `json:"attempts"`
	ExpiresAt time.Time `json:"expires_at"`
	SentAt    time.Time `json:"sent_at"`
}

func (EmailVerification) TableName() string { return "email_verifications" }

type Account struct {
	ID         string    `json:"id"`
	AccountID  string    `json:"account_id"`
	ProviderID string    `json:"provider_id"`
	UserID     string    `json:"user_id"`
	Password   *string   `json:"password"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (Account) TableName() string { return "accounts" }

// Proveedor de las credenciales locales en accounts.
const CredentialProvider = "credential"

type Session struct {
	ID                   string    `json:"id"`
	TokenHash            string    `json:"token_hash"`
	UserID               string    `json:"user_id"`
	ActiveOrganizationID *string   `json:"active_organization_id"`
	AuthMethod           string    `json:"auth_method"`
	AuthenticatedAt      time.Time `json:"authenticated_at"`
	ExpiresAt            time.Time `json:"expires_at"`
	IpAddress            *string   `json:"ip_address"`
	UserAgent            *string   `json:"user_agent"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

func (Session) TableName() string { return "sessions" }

type APIKey struct {
	ID             string     `json:"id"`
	UserID         string     `json:"user_id"`
	OrganizationID string     `json:"organization_id"`
	TokenHash      string     `json:"token_hash"`
	Name           string     `json:"name"`
	CreatedAt      time.Time  `json:"created_at"`
	RevokedAt      *time.Time `json:"revoked_at"`
}

func (APIKey) TableName() string { return "api_keys" }

type AuditLog struct {
	ID             string    `json:"id"`
	OrganizationID *string   `json:"organization_id"`
	UserID         *string   `json:"user_id"`
	Action         string    `json:"action"`
	EntityType     string    `json:"entity_type"`
	EntityID       *string   `json:"entity_id"`
	OldData        JSON      `json:"old_data"`
	NewData        JSON      `json:"new_data"`
	Description    *string   `json:"description"`
	IpAddress      *string   `json:"ip_address"`
	UserAgent      *string   `json:"user_agent"`
	CreatedAt      time.Time `json:"created_at"`
}

func (AuditLog) TableName() string { return "audit_logs" }
