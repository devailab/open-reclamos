package migrations

import (
	"time"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/schema"
)

// Esquema inicial común a PostgreSQL y SQLite. Las estructuras son una foto congelada:
// los cambios posteriores se agregan como migraciones nuevas, nunca editando esta.
var initialSchema = &gormigrate.Migration{
	ID: "00001_initial_schema",
	Migrate: func(tx *gorm.DB) error {
		if err := tx.Migrator().CreateTable(initialTables()...); err != nil {
			return err
		}

		return tx.Create([]initialRole{
			{ID: "019f0000-0000-7000-8000-000000000001", Key: "admin", Name: "Administrador", IsSystem: true},
			{ID: "019f0000-0000-7000-8000-000000000002", Key: "operator", Name: "Operador", IsSystem: true},
			{ID: "019f0000-0000-7000-8000-000000000003", Key: "viewer", Name: "Lector", IsSystem: true},
		}).Error
	},
	Rollback: func(tx *gorm.DB) error {
		tables := initialTables()

		for i := len(tables) - 1; i >= 0; i-- {
			// DROP explícito en la misma transacción: el migrador de SQLite usa otra conexión
			// para DropTable y quedaría bloqueado por esta transacción.
			name := tables[i].(schema.Tabler).TableName()

			if err := tx.Exec("DROP TABLE IF EXISTS ?", clause.Table{Name: name}).Error; err != nil {
				return err
			}
		}

		return nil
	},
}

// Orden de creación: cada tabla aparece después de las tablas que referencia.
func initialTables() []any {
	return []any{
		&initialUser{}, &initialEmailVerification{}, &initialAccount{}, &initialCountry{}, &initialUbigeo{},
		&initialOrganization{}, &initialSession{}, &initialRole{}, &initialOrganizationMember{},
		&initialStore{}, &initialOrganizationMemberStore{}, &initialOrganizationInvitation{},
		&initialOrganizationInvitationStore{}, &initialOrganizationSettings{}, &initialStoreCorrelative{},
		&initialAPIKey{}, &initialComplaintReason{}, &initialComplaintCategory{}, &initialComplaint{},
		&initialComplaintDetail{}, &initialComplaintDelivery{}, &initialComplaintAttachment{},
		&initialComplaintHistory{}, &initialWebhookEndpoint{}, &initialWebhookDelivery{}, &initialUpload{},
		&initialExport{}, &initialAuditLog{}, &initialSSOConnection{}, &initialAuthSettings{},
		&initialOIDCConfig{}, &initialSAMLConfig{}, &initialUserSSOIdentity{}, &initialSSOLoginAttempt{},
		&initialSessionOrganizationAuth{},
	}
}

type initialUser struct {
	ID             uuidColumn `gorm:"primaryKey"`
	Name           string     `gorm:"not null"`
	LastName       string     `gorm:"not null"`
	Email          string     `gorm:"not null;uniqueIndex:users_email_key;uniqueIndex:users_email_normalized,expression:lower(email)"`
	EmailVerified  bool       `gorm:"not null;default:false"`
	DocumentType   string     `gorm:"not null;index:users_document_idx,priority:1"`
	DocumentNumber string     `gorm:"not null;index:users_document_idx,priority:2"`
	Image          *string
	SetupStatus    string    `gorm:"not null;default:complete"`
	IsSuperAdmin   bool      `gorm:"not null;default:false"`
	Active         bool      `gorm:"not null;default:true"`
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialUser) TableName() string { return "users" }

// Código OTP vigente para verificar el email de un registro público.
type initialEmailVerification struct {
	UserID    uuidColumn  `gorm:"primaryKey"`
	User      initialUser `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	CodeHash  string      `gorm:"not null"`
	Attempts  int         `gorm:"not null;default:0"`
	ExpiresAt time.Time   `gorm:"not null"`
	SentAt    time.Time   `gorm:"not null"`
}

func (initialEmailVerification) TableName() string { return "email_verifications" }

type initialAccount struct {
	ID         uuidColumn  `gorm:"primaryKey"`
	AccountID  string      `gorm:"not null;uniqueIndex:accounts_provider_account_key,priority:2"`
	ProviderID string      `gorm:"not null;uniqueIndex:accounts_provider_account_key,priority:1;uniqueIndex:accounts_user_provider_key,priority:2"`
	UserID     uuidColumn  `gorm:"not null;uniqueIndex:accounts_user_provider_key,priority:1"`
	User       initialUser `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Password   *string
	CreatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialAccount) TableName() string { return "accounts" }

type initialCountry struct {
	ID        uuidColumn `gorm:"primaryKey"`
	Name      string     `gorm:"not null"`
	Iso2      string     `gorm:"column:iso2;not null;uniqueIndex:countries_iso2_key"`
	Iso3      string     `gorm:"column:iso3;not null;uniqueIndex:countries_iso3_key"`
	PhoneCode string     `gorm:"not null"`
	Continent string     `gorm:"not null"`
}

func (initialCountry) TableName() string { return "countries" }

type initialUbigeo struct {
	ID           uuidColumn `gorm:"primaryKey"`
	Ubigeo       string     `gorm:"not null;uniqueIndex:ubigeos_ubigeo_key"`
	UbigeoReniec *string    `gorm:"uniqueIndex:ubigeos_ubigeo_reniec_key"`
	Department   string     `gorm:"not null"`
	Province     string     `gorm:"not null"`
	District     string     `gorm:"not null"`
	Name         string     `gorm:"not null"`
}

func (initialUbigeo) TableName() string { return "ubigeos" }

type initialOrganization struct {
	ID               uuidColumn    `gorm:"primaryKey"`
	UbigeoID         uuidColumn    `gorm:"not null"`
	Ubigeo           initialUbigeo `gorm:"foreignKey:UbigeoID"`
	Slug             string        `gorm:"not null;uniqueIndex:organizations_slug_key"`
	BusinessDomain   *string       `gorm:"index:organizations_business_domain_idx"`
	DeletedAt        *time.Time
	Name             string `gorm:"not null"`
	LegalName        string `gorm:"not null"`
	TaxID            string `gorm:"not null;uniqueIndex:organizations_tax_id_key"`
	AddressType      string `gorm:"not null"`
	Address          string `gorm:"not null"`
	PhoneCode        *string
	Phone            *string
	Website          *string
	PrimaryColor     *string
	LogoKey          *string
	Status           string `gorm:"not null;default:active;check:organizations_status_check,status IN ('active','suspended')"`
	SuspendedAt      *time.Time
	SuspendedBy      *uuidColumn
	Suspender        *initialUser `gorm:"foreignKey:SuspendedBy"`
	SuspensionReason *string
	CreatedAt        time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy        *uuidColumn
	Creator          *initialUser `gorm:"foreignKey:CreatedBy;constraint:OnDelete:SET NULL"`
	UpdatedAt        *time.Time
	UpdatedBy        *uuidColumn
	Updater          *initialUser `gorm:"foreignKey:UpdatedBy;constraint:OnDelete:SET NULL"`
}

func (initialOrganization) TableName() string { return "organizations" }

type initialSession struct {
	ID                   uuidColumn  `gorm:"primaryKey"`
	TokenHash            string      `gorm:"not null;uniqueIndex:sessions_token_hash_key"`
	UserID               uuidColumn  `gorm:"not null;index:sessions_user_idx"`
	User                 initialUser `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	ActiveOrganizationID *uuidColumn
	ActiveOrganization   *initialOrganization `gorm:"foreignKey:ActiveOrganizationID;constraint:OnDelete:SET NULL"`
	AuthMethod           string               `gorm:"not null;check:sessions_auth_method_check,auth_method IN ('local','oidc','saml')"`
	AuthenticatedAt      time.Time            `gorm:"not null;default:CURRENT_TIMESTAMP"`
	ExpiresAt            time.Time            `gorm:"not null"`
	IpAddress            *string
	UserAgent            *string
	CreatedAt            time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt            time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialSession) TableName() string { return "sessions" }

type initialRole struct {
	ID          uuidColumn `gorm:"primaryKey"`
	Key         string     `gorm:"not null;uniqueIndex:roles_key_key;check:roles_key_check,key IN ('admin','operator','viewer')"`
	Name        string     `gorm:"not null"`
	Description *string
	IsSystem    bool `gorm:"not null;default:true;check:roles_is_system_check,is_system"`
}

func (initialRole) TableName() string { return "roles" }

type initialOrganizationMember struct {
	UserID          uuidColumn          `gorm:"primaryKey"`
	User            initialUser         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	OrganizationID  uuidColumn          `gorm:"primaryKey"`
	Organization    initialOrganization `gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	RoleID          uuidColumn          `gorm:"not null"`
	Role            initialRole         `gorm:"foreignKey:RoleID"`
	StoreAccessMode string              `gorm:"not null;default:all;check:organization_members_store_access_mode_check,store_access_mode IN ('all','selected')"`
	CreatedAt       time.Time           `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy       *uuidColumn
	Creator         *initialUser `gorm:"foreignKey:CreatedBy;constraint:OnDelete:SET NULL"`
	UpdatedAt       *time.Time
	UpdatedBy       *uuidColumn
	Updater         *initialUser `gorm:"foreignKey:UpdatedBy;constraint:OnDelete:SET NULL"`
}

func (initialOrganizationMember) TableName() string { return "organization_members" }

// Referencia a la clave compuesta de organization_members. GORM prueba primero "has one" y,
// si el destino tiene campos con el mismo nombre que la FK, invierte la relación; estos
// nombres distintos (mismas columnas) fuerzan la FK correcta "belongs to".
type initialMemberKey struct {
	MemberUserID         uuidColumn `gorm:"column:user_id;primaryKey"`
	MemberOrganizationID uuidColumn `gorm:"column:organization_id;primaryKey"`
}

func (initialMemberKey) TableName() string { return "organization_members" }

type initialStore struct {
	ID             uuidColumn          `gorm:"primaryKey;uniqueIndex:stores_organization_id_id_key,priority:2"`
	OrganizationID uuidColumn          `gorm:"not null;uniqueIndex:stores_organization_id_id_key,priority:1"`
	Organization   initialOrganization `gorm:"foreignKey:OrganizationID"`
	UbigeoID       *uuidColumn
	Ubigeo         *initialUbigeo `gorm:"foreignKey:UbigeoID"`
	Slug           string         `gorm:"not null;uniqueIndex:stores_slug_key"`
	Name           string         `gorm:"not null"`
	Type           string         `gorm:"not null;check:stores_type_check,type IN ('physical','virtual')"`
	Color          string         `gorm:"not null;default:#2563EB"`
	AddressType    *string
	Address        *string
	Url            *string
	FormEnabled    bool `gorm:"not null;default:true"`
	DeletedAt      *time.Time
	DeletedBy      *uuidColumn
	Deleter        *initialUser `gorm:"foreignKey:DeletedBy"`
	CreatedAt      time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy      *uuidColumn
	Creator        *initialUser `gorm:"foreignKey:CreatedBy"`
	UpdatedAt      *time.Time
	UpdatedBy      *uuidColumn
	Updater        *initialUser `gorm:"foreignKey:UpdatedBy"`
}

func (initialStore) TableName() string { return "stores" }

type initialOrganizationMemberStore struct {
	UserID         uuidColumn       `gorm:"primaryKey"`
	OrganizationID uuidColumn       `gorm:"primaryKey"`
	StoreID        uuidColumn       `gorm:"primaryKey"`
	Member         initialMemberKey `gorm:"foreignKey:UserID,OrganizationID;references:MemberUserID,MemberOrganizationID;constraint:OnDelete:CASCADE"`
	Store          initialStore     `gorm:"foreignKey:OrganizationID,StoreID;references:OrganizationID,ID"`
	CreatedAt      time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy      *uuidColumn
	Creator        *initialUser `gorm:"foreignKey:CreatedBy"`
}

func (initialOrganizationMemberStore) TableName() string { return "organization_member_stores" }

type initialOrganizationInvitation struct {
	ID              uuidColumn          `gorm:"primaryKey;uniqueIndex:organization_invitations_organization_id_id_key,priority:2"`
	OrganizationID  uuidColumn          `gorm:"not null;uniqueIndex:organization_invitations_organization_id_id_key,priority:1"`
	Organization    initialOrganization `gorm:"foreignKey:OrganizationID"`
	RoleID          uuidColumn          `gorm:"not null"`
	Role            initialRole         `gorm:"foreignKey:RoleID"`
	Email           string              `gorm:"not null"`
	TokenHash       string              `gorm:"not null;uniqueIndex:organization_invitations_token_hash_key"`
	StoreAccessMode string              `gorm:"not null;default:all;check:organization_invitations_store_access_mode_check,store_access_mode IN ('all','selected')"`
	ExpiresAt       time.Time           `gorm:"not null"`
	AcceptedAt      *time.Time
	RevokedAt       *time.Time
	CreatedAt       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy       *uuidColumn
	Creator         *initialUser `gorm:"foreignKey:CreatedBy"`
	AcceptedBy      *uuidColumn
	Acceptor        *initialUser `gorm:"foreignKey:AcceptedBy"`
	RevokedBy       *uuidColumn
	Revoker         *initialUser `gorm:"foreignKey:RevokedBy"`
}

func (initialOrganizationInvitation) TableName() string { return "organization_invitations" }

type initialOrganizationInvitationStore struct {
	InvitationID   uuidColumn                    `gorm:"primaryKey"`
	OrganizationID uuidColumn                    `gorm:"not null"`
	StoreID        uuidColumn                    `gorm:"primaryKey"`
	Invitation     initialOrganizationInvitation `gorm:"foreignKey:OrganizationID,InvitationID;references:OrganizationID,ID;constraint:OnDelete:CASCADE"`
	Store          initialStore                  `gorm:"foreignKey:OrganizationID,StoreID;references:OrganizationID,ID"`
	CreatedAt      time.Time                     `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialOrganizationInvitationStore) TableName() string { return "organization_invitation_stores" }

type initialOrganizationSettings struct {
	ID                   uuidColumn          `gorm:"primaryKey"`
	OrganizationID       uuidColumn          `gorm:"not null;uniqueIndex:organization_settings_organization_id_key"`
	Organization         initialOrganization `gorm:"foreignKey:OrganizationID"`
	ResponseDeadlineDays int32               `gorm:"not null;default:15;check:organization_settings_response_deadline_days_check,response_deadline_days BETWEEN 1 AND 365"`
	FormEnabled          bool                `gorm:"not null;default:true"`
	McpEnabledTools      jsonColumn
	McpShowSensitiveData bool      `gorm:"not null;default:false"`
	CreatedAt            time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy            *uuidColumn
	Creator              *initialUser `gorm:"foreignKey:CreatedBy"`
	UpdatedAt            *time.Time
	UpdatedBy            *uuidColumn
	Updater              *initialUser `gorm:"foreignKey:UpdatedBy"`
}

func (initialOrganizationSettings) TableName() string { return "organization_settings" }

type initialStoreCorrelative struct {
	ID           uuidColumn   `gorm:"primaryKey"`
	StoreID      uuidColumn   `gorm:"not null;uniqueIndex:store_correlatives_store_id_key"`
	Store        initialStore `gorm:"foreignKey:StoreID"`
	CurrentValue int32        `gorm:"not null;default:0"`
	UpdatedAt    time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialStoreCorrelative) TableName() string { return "store_correlatives" }

type initialAPIKey struct {
	ID             uuidColumn       `gorm:"primaryKey"`
	UserID         uuidColumn       `gorm:"not null"`
	OrganizationID uuidColumn       `gorm:"not null"`
	Member         initialMemberKey `gorm:"foreignKey:UserID,OrganizationID;references:MemberUserID,MemberOrganizationID;constraint:OnDelete:CASCADE"`
	TokenHash      string           `gorm:"not null;uniqueIndex:api_keys_token_hash_key"`
	Name           string           `gorm:"not null"`
	CreatedAt      time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP"`
	RevokedAt      *time.Time
}

func (initialAPIKey) TableName() string { return "api_keys" }

type initialComplaintReason struct {
	ID             uuidColumn `gorm:"primaryKey;check:complaint_reasons_parent_check,parent_id IS NULL OR parent_id <> id"`
	OrganizationID *uuidColumn
	Organization   *initialOrganization `gorm:"foreignKey:OrganizationID"`
	ParentID       *uuidColumn
	Parent         *initialComplaintReason `gorm:"foreignKey:ParentID"`
	Reason         string                  `gorm:"not null"`
	DeletedAt      *time.Time
	DeletedBy      *uuidColumn
	Deleter        *initialUser `gorm:"foreignKey:DeletedBy"`
	CreatedAt      time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy      *uuidColumn
	Creator        *initialUser `gorm:"foreignKey:CreatedBy;constraint:OnDelete:SET NULL"`
	UpdatedAt      *time.Time
	UpdatedBy      *uuidColumn
	Updater        *initialUser `gorm:"foreignKey:UpdatedBy"`
}

func (initialComplaintReason) TableName() string { return "complaint_reasons" }

type initialComplaintCategory struct {
	ID             uuidColumn          `gorm:"primaryKey;uniqueIndex:complaint_categories_organization_id_id_key,priority:2"`
	OrganizationID uuidColumn          `gorm:"not null;uniqueIndex:complaint_categories_organization_id_name_key,priority:1;uniqueIndex:complaint_categories_organization_id_id_key,priority:1"`
	Organization   initialOrganization `gorm:"foreignKey:OrganizationID"`
	Name           string              `gorm:"not null;uniqueIndex:complaint_categories_organization_id_name_key,priority:2"`
	Description    *string
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy      *uuidColumn
	Creator        *initialUser `gorm:"foreignKey:CreatedBy"`
	UpdatedAt      *time.Time
	UpdatedBy      *uuidColumn
	Updater        *initialUser `gorm:"foreignKey:UpdatedBy"`
}

func (initialComplaintCategory) TableName() string { return "complaint_categories" }

type initialComplaint struct {
	ID                     uuidColumn                `gorm:"primaryKey;uniqueIndex:complaints_organization_id_id_key,priority:2"`
	OrganizationID         uuidColumn                `gorm:"not null;uniqueIndex:complaints_organization_id_tracking_code_key,priority:1;uniqueIndex:complaints_organization_id_id_key,priority:1;index:complaints_org_created_idx,priority:1;index:complaints_org_status_idx,priority:1;index:complaints_org_store_idx,priority:1;index:complaints_org_deadline_idx,priority:1"`
	Organization           initialOrganization       `gorm:"foreignKey:OrganizationID"`
	StoreID                uuidColumn                `gorm:"not null;uniqueIndex:complaints_store_id_tracking_code_key,priority:1;uniqueIndex:complaints_store_id_correlative_key,priority:1;index:complaints_org_store_idx,priority:2"`
	Store                  initialStore              `gorm:"foreignKey:OrganizationID,StoreID;references:OrganizationID,ID"`
	ReasonID               *uuidColumn               ``
	Reason                 *initialComplaintReason   `gorm:"foreignKey:ReasonID"`
	CategoryID             *uuidColumn               ``
	Category               *initialComplaintCategory `gorm:"foreignKey:OrganizationID,CategoryID;references:OrganizationID,ID"`
	UbigeoID               *uuidColumn               ``
	Ubigeo                 *initialUbigeo            `gorm:"foreignKey:UbigeoID"`
	Status                 string                    `gorm:"not null;default:open;index:complaints_org_status_idx,priority:2;check:complaints_status_check,status IN ('open','in_review','resolved')"`
	Priority               string                    `gorm:"not null;default:medium;check:complaints_priority_check,priority IN ('low','medium','high','urgent')"`
	TrackingCode           string                    `gorm:"not null;uniqueIndex:complaints_store_id_tracking_code_key,priority:2;uniqueIndex:complaints_organization_id_tracking_code_key,priority:2"`
	Correlative            string                    `gorm:"not null;uniqueIndex:complaints_store_id_correlative_key,priority:2"`
	FirstName              string                    `gorm:"not null"`
	LastName               string                    `gorm:"not null"`
	DocumentType           string                    `gorm:"not null"`
	DocumentNumber         string                    `gorm:"not null"`
	PersonType             string                    `gorm:"not null;default:natural"`
	LegalName              *string
	LegalTaxID             *string
	IsMinor                bool `gorm:"not null;default:false"`
	GuardianFirstName      *string
	GuardianLastName       *string
	GuardianDocumentType   *string
	GuardianDocumentNumber *string
	Email                  string `gorm:"not null"`
	DialCode               *string
	Phone                  *string
	Address                *string
	Type                   string `gorm:"not null;check:complaints_type_check,type IN ('claim','complaint')"`
	ItemType               *string
	ItemDescription        *string
	Currency               *string
	Amount                 *string `gorm:"type:numeric(10,2)"`
	HasProofOfPayment      bool    `gorm:"not null;default:false"`
	ProofOfPaymentType     *string
	ProofOfPaymentNumber   *string
	IncidentDate           *time.Time
	ResponseDeadlineDays   int32     `gorm:"not null;default:15"`
	ResponseDeadline       time.Time `gorm:"not null;index:complaints_org_deadline_idx,priority:2"`
	Description            *string
	Request                *string
	CreatedAt              time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:complaints_org_created_idx,priority:2,sort:desc;index:complaints_org_status_idx,priority:3,sort:desc;index:complaints_org_store_idx,priority:3,sort:desc"`
	UpdatedAt              *time.Time
	UpdatedBy              *uuidColumn
	Updater                *initialUser `gorm:"foreignKey:UpdatedBy"`
}

func (initialComplaint) TableName() string { return "complaints" }

type initialComplaintDetail struct {
	ID               uuidColumn       `gorm:"primaryKey"`
	OrganizationID   uuidColumn       `gorm:"not null"`
	ComplaintID      uuidColumn       `gorm:"not null;uniqueIndex:complaint_details_complaint_id_key"`
	Complaint        initialComplaint `gorm:"foreignKey:OrganizationID,ComplaintID;references:OrganizationID,ID"`
	DraftResponse    *string
	DraftUpdatedAt   *time.Time
	DraftSavedBy     *uuidColumn
	DraftSaver       *initialUser `gorm:"foreignKey:DraftSavedBy"`
	OfficialResponse *string
	RespondedAt      *time.Time
	RespondedBy      *uuidColumn
	Responder        *initialUser `gorm:"foreignKey:RespondedBy"`
	CreatedAt        time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt        time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialComplaintDetail) TableName() string { return "complaint_details" }

type initialComplaintDelivery struct {
	ID                     uuidColumn       `gorm:"primaryKey"`
	OrganizationID         uuidColumn       `gorm:"not null"`
	ComplaintID            uuidColumn       `gorm:"not null;uniqueIndex:complaint_deliveries_complaint_id_key"`
	Complaint              initialComplaint `gorm:"foreignKey:OrganizationID,ComplaintID;references:OrganizationID,ID"`
	ReceiptDeliveryStatus  *string
	ReceiptDeliverySentAt  *time.Time
	ReceiptDeliveryError   *string
	ResponseDeliveryStatus *string
	ResponseDeliverySentAt *time.Time
	ResponseDeliveryError  *string
	ReceiptDocumentKey     *string
	ResponseDocumentKey    *string
	CreatedAt              time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt              time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialComplaintDelivery) TableName() string { return "complaint_deliveries" }

type initialComplaintAttachment struct {
	ID          uuidColumn       `gorm:"primaryKey"`
	ComplaintID uuidColumn       `gorm:"not null"`
	Complaint   initialComplaint `gorm:"foreignKey:ComplaintID"`
	StorageKey  string           `gorm:"not null;uniqueIndex:complaint_attachments_storage_key_key"`
	FileName    string           `gorm:"not null"`
	ContentType *string
	Description *string
}

func (initialComplaintAttachment) TableName() string { return "complaint_attachments" }

type initialComplaintHistory struct {
	ID              uuidColumn       `gorm:"primaryKey;index:history_complaint_created_idx,priority:3"`
	ComplaintID     uuidColumn       `gorm:"not null;index:history_complaint_created_idx,priority:1"`
	Complaint       initialComplaint `gorm:"foreignKey:ComplaintID"`
	EventType       string           `gorm:"not null"`
	FromStatus      *string
	ToStatus        *string
	PublicNote      *string
	InternalNote    *string
	PerformedBy     *uuidColumn
	Performer       *initialUser `gorm:"foreignKey:PerformedBy"`
	PerformedByRole string       `gorm:"not null;default:system"`
	CreatedAt       time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP;index:history_complaint_created_idx,priority:2"`
}

func (initialComplaintHistory) TableName() string { return "complaint_history" }

type initialWebhookEndpoint struct {
	ID              uuidColumn          `gorm:"primaryKey;uniqueIndex:webhook_endpoints_organization_id_id_key,priority:2"`
	OrganizationID  uuidColumn          `gorm:"not null;uniqueIndex:webhook_endpoints_organization_id_slug_key,priority:1;uniqueIndex:webhook_endpoints_organization_id_id_key,priority:1"`
	Organization    initialOrganization `gorm:"foreignKey:OrganizationID"`
	Name            string              `gorm:"not null"`
	Slug            string              `gorm:"not null;uniqueIndex:webhook_endpoints_organization_id_slug_key,priority:2"`
	TargetUrl       string              `gorm:"not null"`
	Events          jsonColumn          `gorm:"not null;default:'[]'"`
	Status          string              `gorm:"not null;default:active"`
	SecretEncrypted *string
	CustomHeaders   jsonColumn
	TimeoutMs       int32 `gorm:"not null;default:15000;check:webhook_endpoints_timeout_ms_check,timeout_ms BETWEEN 1000 AND 30000"`
	DeletedAt       *time.Time
	DeletedBy       *uuidColumn
	Deleter         *initialUser `gorm:"foreignKey:DeletedBy"`
	CreatedAt       time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy       *uuidColumn
	Creator         *initialUser `gorm:"foreignKey:CreatedBy"`
	UpdatedAt       *time.Time
	UpdatedBy       *uuidColumn
	Updater         *initialUser `gorm:"foreignKey:UpdatedBy"`
}

func (initialWebhookEndpoint) TableName() string { return "webhook_endpoints" }

type initialWebhookDelivery struct {
	ID             uuidColumn              `gorm:"primaryKey"`
	OrganizationID uuidColumn              `gorm:"not null;index:webhook_deliveries_org_idx,priority:1"`
	Organization   initialOrganization     `gorm:"foreignKey:OrganizationID"`
	EndpointID     *uuidColumn             ``
	Endpoint       *initialWebhookEndpoint `gorm:"foreignKey:OrganizationID,EndpointID;references:OrganizationID,ID"`
	EventKey       string                  `gorm:"not null"`
	EntityType     string                  `gorm:"not null"`
	EntityID       *uuidColumn
	Status         string `gorm:"not null;default:pending"`
	AttemptCount   int32  `gorm:"not null;default:0"`
	RequestBody    jsonColumn
	ResponseStatus *int32
	ResponseBody   *string
	ErrorMessage   *string
	NextAttemptAt  *time.Time
	SentAt         *time.Time
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:webhook_deliveries_org_idx,priority:2,sort:desc"`
	UpdatedAt      *time.Time
}

func (initialWebhookDelivery) TableName() string { return "webhook_deliveries" }

type initialUpload struct {
	ID             uuidColumn    `gorm:"primaryKey"`
	OrganizationID uuidColumn    `gorm:"not null"`
	StoreID        *uuidColumn   ``
	Store          *initialStore `gorm:"foreignKey:OrganizationID,StoreID;references:OrganizationID,ID"`
	StorageKey     string        `gorm:"not null;uniqueIndex:uploads_storage_key_key"`
	TokenHash      string        `gorm:"not null"`
	FileName       string        `gorm:"not null"`
	ContentType    string        `gorm:"not null"`
	SizeBytes      int64         `gorm:"not null"`
	ExpiresAt      time.Time     `gorm:"not null"`
	ClaimedAt      *time.Time
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (initialUpload) TableName() string { return "uploads" }

type initialExport struct {
	ID             uuidColumn          `gorm:"primaryKey"`
	OrganizationID uuidColumn          `gorm:"not null;index:exports_org_user_idx,priority:1"`
	Organization   initialOrganization `gorm:"foreignKey:OrganizationID"`
	UserID         uuidColumn          `gorm:"not null;index:exports_org_user_idx,priority:2"`
	User           initialUser         `gorm:"foreignKey:UserID"`
	StoreIds       jsonColumn          `gorm:"not null"`
	Filters        jsonColumn          `gorm:"not null"`
	Format         string              `gorm:"not null;check:exports_format_check,format IN ('pdf','xlsx')"`
	Status         string              `gorm:"not null;default:queued;check:exports_status_check,status IN ('queued','completed','failed')"`
	StorageKey     *string
	ErrorMessage   *string
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:exports_org_user_idx,priority:3,sort:desc"`
	ExpiresAt      time.Time `gorm:"not null"`
}

func (initialExport) TableName() string { return "exports" }

type initialAuditLog struct {
	ID             uuidColumn  `gorm:"primaryKey"`
	OrganizationID *uuidColumn `gorm:"index:audit_org_created_idx,priority:1;index:audit_org_entity_idx,priority:1"`
	UserID         *uuidColumn
	Action         string      `gorm:"not null"`
	EntityType     string      `gorm:"not null"`
	EntityID       *uuidColumn `gorm:"index:audit_org_entity_idx,priority:2"`
	OldData        jsonColumn
	NewData        jsonColumn
	Description    *string
	IpAddress      *string
	UserAgent      *string
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:audit_org_created_idx,priority:2,sort:desc;index:audit_org_entity_idx,priority:3,sort:desc"`
}

func (initialAuditLog) TableName() string { return "audit_logs" }

type initialSSOConnection struct {
	ID             uuidColumn          `gorm:"primaryKey;uniqueIndex:organization_sso_connections_organization_id_id_key,priority:2"`
	OrganizationID uuidColumn          `gorm:"not null;uniqueIndex:organization_sso_connections_organization_id_id_key,priority:1"`
	Organization   initialOrganization `gorm:"foreignKey:OrganizationID"`
	Protocol       string              `gorm:"not null;check:organization_sso_connections_protocol_check,protocol IN ('oidc','saml')"`
	Name           string              `gorm:"not null"`
	Status         string              `gorm:"not null;default:draft;check:organization_sso_connections_status_check,status IN ('draft','active','disabled')"`
	ConfigVersion  int32               `gorm:"not null;default:1"`
	TestedVersion  *int32
	TestedAt       *time.Time
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	CreatedBy      *uuidColumn
	Creator        *initialUser `gorm:"foreignKey:CreatedBy"`
	UpdatedAt      *time.Time
}

func (initialSSOConnection) TableName() string { return "organization_sso_connections" }

type initialAuthSettings struct {
	OrganizationID     uuidColumn            `gorm:"primaryKey"`
	Organization       initialOrganization   `gorm:"foreignKey:OrganizationID"`
	LoginMode          string                `gorm:"not null;default:local;check:organization_auth_settings_login_mode_check,login_mode IN ('local','mixed','sso_required')"`
	ActiveConnectionID *uuidColumn           ``
	ActiveConnection   *initialSSOConnection `gorm:"foreignKey:OrganizationID,ActiveConnectionID;references:OrganizationID,ID"`
	PolicyVersion      int32                 `gorm:"not null;default:1"`
}

func (initialAuthSettings) TableName() string { return "organization_auth_settings" }

type initialOIDCConfig struct {
	ConnectionID          uuidColumn           `gorm:"primaryKey"`
	Connection            initialSSOConnection `gorm:"foreignKey:ConnectionID;constraint:OnDelete:CASCADE"`
	IssuerUrl             string               `gorm:"not null"`
	ClientID              string               `gorm:"not null"`
	ClientSecretEncrypted string               `gorm:"not null"`
	Scopes                jsonColumn           `gorm:"not null"`
}

func (initialOIDCConfig) TableName() string { return "organization_oidc_configs" }

type initialSAMLConfig struct {
	ConnectionID          uuidColumn           `gorm:"primaryKey"`
	Connection            initialSSOConnection `gorm:"foreignKey:ConnectionID;constraint:OnDelete:CASCADE"`
	IdpMetadataXml        string               `gorm:"not null"`
	IdpEntityID           string               `gorm:"not null"`
	SpCertificate         string               `gorm:"not null"`
	SpPrivateKeyEncrypted string               `gorm:"not null"`
	SubjectAttribute      *string
	EmailAttribute        string `gorm:"not null;default:email"`
	NameAttribute         string `gorm:"not null;default:name"`
}

func (initialSAMLConfig) TableName() string { return "organization_saml_configs" }

type initialUserSSOIdentity struct {
	ID             uuidColumn           `gorm:"primaryKey"`
	OrganizationID uuidColumn           `gorm:"not null"`
	ConnectionID   uuidColumn           `gorm:"not null;uniqueIndex:user_sso_identities_connection_issuer_subject_key,priority:1"`
	Connection     initialSSOConnection `gorm:"foreignKey:OrganizationID,ConnectionID;references:OrganizationID,ID"`
	UserID         uuidColumn           `gorm:"not null"`
	Member         initialMemberKey     `gorm:"foreignKey:UserID,OrganizationID;references:MemberUserID,MemberOrganizationID;constraint:OnDelete:CASCADE"`
	Issuer         string               `gorm:"not null;uniqueIndex:user_sso_identities_connection_issuer_subject_key,priority:2"`
	Subject        string               `gorm:"not null;uniqueIndex:user_sso_identities_connection_issuer_subject_key,priority:3"`
	LastLoginAt    *time.Time
}

func (initialUserSSOIdentity) TableName() string { return "user_sso_identities" }

type initialSSOLoginAttempt struct {
	ID                    uuidColumn           `gorm:"primaryKey"`
	OrganizationID        uuidColumn           `gorm:"not null"`
	ConnectionID          uuidColumn           `gorm:"not null"`
	Connection            initialSSOConnection `gorm:"foreignKey:OrganizationID,ConnectionID;references:OrganizationID,ID"`
	ConfigVersion         int32                `gorm:"not null"`
	Purpose               string               `gorm:"not null;check:sso_login_attempts_purpose_check,purpose IN ('login','link','test')"`
	UserID                *uuidColumn
	User                  *initialUser `gorm:"foreignKey:UserID"`
	StateHash             string       `gorm:"not null;uniqueIndex:sso_login_attempts_state_hash_key"`
	BrowserHash           string       `gorm:"not null"`
	Nonce                 *string
	PkceVerifierEncrypted *string
	SamlRequestID         *string   `gorm:"uniqueIndex:sso_login_attempts_saml_request_id_key"`
	AssertionID           *string   `gorm:"uniqueIndex:sso_login_attempts_assertion_id_key"`
	ExpiresAt             time.Time `gorm:"not null"`
	ConsumedAt            *time.Time
}

func (initialSSOLoginAttempt) TableName() string { return "sso_login_attempts" }

type initialSessionOrganizationAuth struct {
	SessionID       uuidColumn            `gorm:"primaryKey"`
	Session         initialSession        `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`
	OrganizationID  uuidColumn            `gorm:"primaryKey"`
	Organization    initialOrganization   `gorm:"foreignKey:OrganizationID"`
	Method          string                `gorm:"not null;check:session_organization_auth_method_check,method IN ('local','oidc','saml')"`
	ConnectionID    *uuidColumn           ``
	Connection      *initialSSOConnection `gorm:"foreignKey:OrganizationID,ConnectionID;references:OrganizationID,ID"`
	PolicyVersion   int32                 `gorm:"not null"`
	AuthenticatedAt time.Time             `gorm:"not null;default:CURRENT_TIMESTAMP"`
	ExpiresAt       time.Time             `gorm:"not null"`
}

func (initialSessionOrganizationAuth) TableName() string { return "session_organization_auth" }
