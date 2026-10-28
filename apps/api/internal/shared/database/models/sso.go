package models

import "time"

type SSOConnection struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Protocol       string     `json:"protocol"`
	Name           string     `json:"name"`
	Status         string     `json:"status"`
	ConfigVersion  int32      `json:"config_version"`
	TestedVersion  *int32     `json:"tested_version"`
	TestedAt       *time.Time `json:"tested_at"`
	CreatedAt      time.Time  `json:"created_at"`
	CreatedBy      *string    `json:"created_by"`
	UpdatedAt      *time.Time `json:"updated_at"      gorm:"autoUpdateTime:false"`
}

func (SSOConnection) TableName() string { return "organization_sso_connections" }

type OIDCConfig struct {
	ConnectionID          string     `json:"connection_id"           gorm:"primaryKey"`
	IssuerUrl             string     `json:"issuer_url"`
	ClientID              string     `json:"client_id"`
	ClientSecretEncrypted string     `json:"client_secret_encrypted"`
	Scopes                StringList `json:"scopes"`
}

func (OIDCConfig) TableName() string { return "organization_oidc_configs" }

// Scopes solicitados a todo proveedor OIDC.
var DefaultOIDCScopes = StringList{"openid", "profile", "email"}

type SAMLConfig struct {
	ConnectionID          string  `json:"connection_id"            gorm:"primaryKey"`
	IdpMetadataXml        string  `json:"idp_metadata_xml"`
	IdpEntityID           string  `json:"idp_entity_id"`
	SpCertificate         string  `json:"sp_certificate"`
	SpPrivateKeyEncrypted string  `json:"sp_private_key_encrypted"`
	SubjectAttribute      *string `json:"subject_attribute"`
	EmailAttribute        string  `json:"email_attribute"`
	NameAttribute         string  `json:"name_attribute"`
}

func (SAMLConfig) TableName() string { return "organization_saml_configs" }

type UserSSOIdentity struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	ConnectionID   string     `json:"connection_id"`
	UserID         string     `json:"user_id"`
	Issuer         string     `json:"issuer"`
	Subject        string     `json:"subject"`
	LastLoginAt    *time.Time `json:"last_login_at"`
}

func (UserSSOIdentity) TableName() string { return "user_sso_identities" }

type SSOLoginAttempt struct {
	ID                    string     `json:"id"`
	OrganizationID        string     `json:"organization_id"`
	ConnectionID          string     `json:"connection_id"`
	ConfigVersion         int32      `json:"config_version"`
	Purpose               string     `json:"purpose"`
	UserID                *string    `json:"user_id"`
	StateHash             string     `json:"state_hash"`
	BrowserHash           string     `json:"browser_hash"`
	Nonce                 *string    `json:"nonce"`
	PkceVerifierEncrypted *string    `json:"pkce_verifier_encrypted"`
	SamlRequestID         *string    `json:"saml_request_id"`
	AssertionID           *string    `json:"assertion_id"`
	ExpiresAt             time.Time  `json:"expires_at"`
	ConsumedAt            *time.Time `json:"consumed_at"`
}

func (SSOLoginAttempt) TableName() string { return "sso_login_attempts" }
