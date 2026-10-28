package models

import "time"

type Country struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Iso2      string `json:"iso2"       gorm:"column:iso2"`
	Iso3      string `json:"iso3"       gorm:"column:iso3"`
	PhoneCode string `json:"phone_code"`
	Continent string `json:"continent"`
}

func (Country) TableName() string { return "countries" }

type Ubigeo struct {
	ID           string  `json:"id"`
	Ubigeo       string  `json:"ubigeo"`
	UbigeoReniec *string `json:"ubigeo_reniec"`
	Department   string  `json:"department"`
	Province     string  `json:"province"`
	District     string  `json:"district"`
	Name         string  `json:"name"`
}

func (Ubigeo) TableName() string { return "ubigeos" }

type Organization struct {
	ID               string     `json:"id"`
	UbigeoID         string     `json:"ubigeo_id"`
	Slug             string     `json:"slug"`
	BusinessDomain   *string    `json:"business_domain"`
	DeletedAt        *time.Time `json:"deleted_at"`
	Name             string     `json:"name"`
	LegalName        string     `json:"legal_name"`
	TaxID            string     `json:"tax_id"`
	AddressType      string     `json:"address_type"`
	Address          string     `json:"address"`
	PhoneCode        *string    `json:"phone_code"`
	Phone            *string    `json:"phone"`
	Website          *string    `json:"website"`
	PrimaryColor     *string    `json:"primary_color"`
	LogoKey          *string    `json:"logo_key"`
	Status           string     `json:"status"`
	SuspendedAt      *time.Time `json:"suspended_at"`
	SuspendedBy      *string    `json:"suspended_by"`
	SuspensionReason *string    `json:"suspension_reason"`
	CreatedAt        time.Time  `json:"created_at"`
	CreatedBy        *string    `json:"created_by"`
	UpdatedAt        *time.Time `json:"updated_at"        gorm:"autoUpdateTime:false"`
	UpdatedBy        *string    `json:"updated_by"`
}

func (Organization) TableName() string { return "organizations" }

type Role struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	IsSystem    bool    `json:"is_system"`
}

func (Role) TableName() string { return "roles" }

type OrganizationMember struct {
	UserID          string     `json:"user_id"           gorm:"primaryKey"`
	OrganizationID  string     `json:"organization_id"   gorm:"primaryKey"`
	RoleID          string     `json:"role_id"`
	StoreAccessMode string     `json:"store_access_mode"`
	CreatedAt       time.Time  `json:"created_at"`
	CreatedBy       *string    `json:"created_by"`
	UpdatedAt       *time.Time `json:"updated_at"        gorm:"autoUpdateTime:false"`
	UpdatedBy       *string    `json:"updated_by"`
}

func (OrganizationMember) TableName() string { return "organization_members" }

type OrganizationMemberStore struct {
	UserID         string    `json:"user_id"         gorm:"primaryKey"`
	OrganizationID string    `json:"organization_id" gorm:"primaryKey"`
	StoreID        string    `json:"store_id"        gorm:"primaryKey"`
	CreatedAt      time.Time `json:"created_at"`
	CreatedBy      *string   `json:"created_by"`
}

func (OrganizationMemberStore) TableName() string { return "organization_member_stores" }

type Store struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	UbigeoID       *string    `json:"ubigeo_id"`
	Slug           string     `json:"slug"`
	Name           string     `json:"name"`
	Type           string     `json:"type"`
	Color          string     `json:"color"`
	AddressType    *string    `json:"address_type"`
	Address        *string    `json:"address"`
	Url            *string    `json:"url"`
	FormEnabled    bool       `json:"form_enabled"`
	DeletedAt      *time.Time `json:"deleted_at"`
	DeletedBy      *string    `json:"deleted_by"`
	CreatedAt      time.Time  `json:"created_at"`
	CreatedBy      *string    `json:"created_by"`
	UpdatedAt      *time.Time `json:"updated_at"      gorm:"autoUpdateTime:false"`
	UpdatedBy      *string    `json:"updated_by"`
}

func (Store) TableName() string { return "stores" }

type StoreCorrelative struct {
	ID           string    `json:"id"`
	StoreID      string    `json:"store_id"`
	CurrentValue int32     `json:"current_value"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (StoreCorrelative) TableName() string { return "store_correlatives" }

type OrganizationInvitation struct {
	ID              string     `json:"id"`
	OrganizationID  string     `json:"organization_id"`
	RoleID          string     `json:"role_id"`
	Email           string     `json:"email"`
	TokenHash       string     `json:"token_hash"`
	StoreAccessMode string     `json:"store_access_mode"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at"`
	RevokedAt       *time.Time `json:"revoked_at"`
	CreatedAt       time.Time  `json:"created_at"`
	CreatedBy       *string    `json:"created_by"`
	AcceptedBy      *string    `json:"accepted_by"`
	RevokedBy       *string    `json:"revoked_by"`
}

func (OrganizationInvitation) TableName() string { return "organization_invitations" }

type OrganizationInvitationStore struct {
	InvitationID   string    `json:"invitation_id"   gorm:"primaryKey"`
	OrganizationID string    `json:"organization_id"`
	StoreID        string    `json:"store_id"        gorm:"primaryKey"`
	CreatedAt      time.Time `json:"created_at"`
}

func (OrganizationInvitationStore) TableName() string { return "organization_invitation_stores" }

type OrganizationSetting struct {
	ID                   string     `json:"id"`
	OrganizationID       string     `json:"organization_id"`
	ResponseDeadlineDays int32      `json:"response_deadline_days"`
	FormEnabled          bool       `json:"form_enabled"`
	McpEnabledTools      JSON       `json:"mcp_enabled_tools"`
	McpShowSensitiveData bool       `json:"mcp_show_sensitive_data"`
	CreatedAt            time.Time  `json:"created_at"`
	CreatedBy            *string    `json:"created_by"`
	UpdatedAt            *time.Time `json:"updated_at"              gorm:"autoUpdateTime:false"`
	UpdatedBy            *string    `json:"updated_by"`
}

func (OrganizationSetting) TableName() string { return "organization_settings" }

type OrganizationAuthSetting struct {
	OrganizationID     string  `json:"organization_id"      gorm:"primaryKey"`
	LoginMode          string  `json:"login_mode"`
	ActiveConnectionID *string `json:"active_connection_id"`
	PolicyVersion      int32   `json:"policy_version"`
}

func (OrganizationAuthSetting) TableName() string { return "organization_auth_settings" }
