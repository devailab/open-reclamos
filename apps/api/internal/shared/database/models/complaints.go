package models

import "time"

type ComplaintReason struct {
	ID             string     `json:"id"`
	OrganizationID *string    `json:"organization_id"`
	ParentID       *string    `json:"parent_id"`
	Reason         string     `json:"reason"`
	DeletedAt      *time.Time `json:"deleted_at"`
	DeletedBy      *string    `json:"deleted_by"`
	CreatedAt      time.Time  `json:"created_at"`
	CreatedBy      *string    `json:"created_by"`
	UpdatedAt      *time.Time `json:"updated_at"      gorm:"autoUpdateTime:false"`
	UpdatedBy      *string    `json:"updated_by"`
}

func (ComplaintReason) TableName() string { return "complaint_reasons" }

type ComplaintCategory struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Name           string     `json:"name"`
	Description    *string    `json:"description"`
	CreatedAt      time.Time  `json:"created_at"`
	CreatedBy      *string    `json:"created_by"`
	UpdatedAt      *time.Time `json:"updated_at"      gorm:"autoUpdateTime:false"`
	UpdatedBy      *string    `json:"updated_by"`
}

func (ComplaintCategory) TableName() string { return "complaint_categories" }

type Complaint struct {
	ID                     string     `json:"id"`
	OrganizationID         string     `json:"organization_id"`
	StoreID                string     `json:"store_id"`
	ReasonID               *string    `json:"reason_id"`
	CategoryID             *string    `json:"category_id"`
	UbigeoID               *string    `json:"ubigeo_id"`
	Status                 string     `json:"status"`
	Priority               string     `json:"priority"`
	TrackingCode           string     `json:"tracking_code"`
	Correlative            string     `json:"correlative"`
	FirstName              string     `json:"first_name"`
	LastName               string     `json:"last_name"`
	DocumentType           string     `json:"document_type"`
	DocumentNumber         string     `json:"document_number"`
	PersonType             string     `json:"person_type"`
	LegalName              *string    `json:"legal_name"`
	LegalTaxID             *string    `json:"legal_tax_id"`
	IsMinor                bool       `json:"is_minor"`
	GuardianFirstName      *string    `json:"guardian_first_name"`
	GuardianLastName       *string    `json:"guardian_last_name"`
	GuardianDocumentType   *string    `json:"guardian_document_type"`
	GuardianDocumentNumber *string    `json:"guardian_document_number"`
	Email                  string     `json:"email"`
	DialCode               *string    `json:"dial_code"`
	Phone                  *string    `json:"phone"`
	Address                *string    `json:"address"`
	Type                   string     `json:"type"`
	ItemType               *string    `json:"item_type"`
	ItemDescription        *string    `json:"item_description"`
	Currency               *string    `json:"currency"`
	Amount                 *Decimal   `json:"amount"`
	HasProofOfPayment      bool       `json:"has_proof_of_payment"`
	ProofOfPaymentType     *string    `json:"proof_of_payment_type"`
	ProofOfPaymentNumber   *string    `json:"proof_of_payment_number"`
	IncidentDate           *time.Time `json:"incident_date"`
	ResponseDeadlineDays   int32      `json:"response_deadline_days"`
	ResponseDeadline       time.Time  `json:"response_deadline"`
	Description            *string    `json:"description"`
	Request                *string    `json:"request"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              *time.Time `json:"updated_at"               gorm:"autoUpdateTime:false"`
	UpdatedBy              *string    `json:"updated_by"`
}

func (Complaint) TableName() string { return "complaints" }

type ComplaintDetail struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	ComplaintID      string     `json:"complaint_id"`
	DraftResponse    *string    `json:"draft_response"`
	DraftUpdatedAt   *time.Time `json:"draft_updated_at"`
	DraftSavedBy     *string    `json:"draft_saved_by"`
	OfficialResponse *string    `json:"official_response"`
	RespondedAt      *time.Time `json:"responded_at"`
	RespondedBy      *string    `json:"responded_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (ComplaintDetail) TableName() string { return "complaint_details" }

type ComplaintDelivery struct {
	ID                     string     `json:"id"`
	OrganizationID         string     `json:"organization_id"`
	ComplaintID            string     `json:"complaint_id"`
	ReceiptDeliveryStatus  *string    `json:"receipt_delivery_status"`
	ReceiptDeliverySentAt  *time.Time `json:"receipt_delivery_sent_at"`
	ReceiptDeliveryError   *string    `json:"receipt_delivery_error"`
	ResponseDeliveryStatus *string    `json:"response_delivery_status"`
	ResponseDeliverySentAt *time.Time `json:"response_delivery_sent_at"`
	ResponseDeliveryError  *string    `json:"response_delivery_error"`
	ReceiptDocumentKey     *string    `json:"receipt_document_key"`
	ResponseDocumentKey    *string    `json:"response_document_key"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

func (ComplaintDelivery) TableName() string { return "complaint_deliveries" }

type ComplaintAttachment struct {
	ID          string  `json:"id"`
	ComplaintID string  `json:"complaint_id"`
	StorageKey  string  `json:"storage_key"`
	FileName    string  `json:"file_name"`
	ContentType *string `json:"content_type"`
	Description *string `json:"description"`
}

func (ComplaintAttachment) TableName() string { return "complaint_attachments" }

type ComplaintHistory struct {
	ID              string    `json:"id"`
	ComplaintID     string    `json:"complaint_id"`
	EventType       string    `json:"event_type"`
	FromStatus      *string   `json:"from_status"`
	ToStatus        *string   `json:"to_status"`
	PublicNote      *string   `json:"public_note"`
	InternalNote    *string   `json:"internal_note"`
	PerformedBy     *string   `json:"performed_by"`
	PerformedByRole string    `json:"performed_by_role"`
	CreatedAt       time.Time `json:"created_at"`
}

func (ComplaintHistory) TableName() string { return "complaint_history" }
