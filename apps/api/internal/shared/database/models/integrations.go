package models

import "time"

type WebhookEndpoint struct {
	ID              string     `json:"id"`
	OrganizationID  string     `json:"organization_id"`
	Name            string     `json:"name"`
	Slug            string     `json:"slug"`
	TargetUrl       string     `json:"target_url"`
	Events          JSON       `json:"events"`
	Status          string     `json:"status"`
	SecretEncrypted *string    `json:"secret_encrypted"`
	CustomHeaders   JSON       `json:"custom_headers"`
	TimeoutMs       int32      `json:"timeout_ms"`
	DeletedAt       *time.Time `json:"deleted_at"`
	DeletedBy       *string    `json:"deleted_by"`
	CreatedAt       time.Time  `json:"created_at"`
	CreatedBy       *string    `json:"created_by"`
	UpdatedAt       *time.Time `json:"updated_at"       gorm:"autoUpdateTime:false"`
	UpdatedBy       *string    `json:"updated_by"`
}

func (WebhookEndpoint) TableName() string { return "webhook_endpoints" }

type WebhookDelivery struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	EndpointID     *string    `json:"endpoint_id"`
	EventKey       string     `json:"event_key"`
	EntityType     string     `json:"entity_type"`
	EntityID       *string    `json:"entity_id"`
	Status         string     `json:"status"`
	AttemptCount   int32      `json:"attempt_count"`
	RequestBody    JSON       `json:"request_body"`
	ResponseStatus *int32     `json:"response_status"`
	ResponseBody   *string    `json:"response_body"`
	ErrorMessage   *string    `json:"error_message"`
	NextAttemptAt  *time.Time `json:"next_attempt_at"`
	SentAt         *time.Time `json:"sent_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"      gorm:"autoUpdateTime:false"`
}

func (WebhookDelivery) TableName() string { return "webhook_deliveries" }

type Upload struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	StoreID        *string    `json:"store_id"`
	StorageKey     string     `json:"storage_key"`
	TokenHash      string     `json:"token_hash"`
	FileName       string     `json:"file_name"`
	ContentType    string     `json:"content_type"`
	SizeBytes      int64      `json:"size_bytes"`
	ExpiresAt      time.Time  `json:"expires_at"`
	ClaimedAt      *time.Time `json:"claimed_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (Upload) TableName() string { return "uploads" }

type Export struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	UserID         string     `json:"user_id"`
	StoreIds       StringList `json:"store_ids"`
	Filters        JSON       `json:"filters"`
	Format         string     `json:"format"`
	Status         string     `json:"status"`
	StorageKey     *string    `json:"storage_key"`
	ErrorMessage   *string    `json:"error_message"`
	CreatedAt      time.Time  `json:"created_at"`
	ExpiresAt      time.Time  `json:"expires_at"`
}

func (Export) TableName() string { return "exports" }
