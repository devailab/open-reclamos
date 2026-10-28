package constants

// Estado general de registros (empresas, membresías, webhooks, conexiones SSO).
const (
	StatusActive    = "active"
	StatusInactive  = "inactive"
	StatusSuspended = "suspended"
)

// Métodos de autenticación de una sesión.
const (
	AuthLocal = "local"
	AuthAPI   = "api"
	AuthOIDC  = "oidc"
	AuthSAML  = "saml"
)

// Políticas de acceso de una empresa.
const (
	LoginModeLocal       = "local"
	LoginModeMixed       = "mixed"
	LoginModeSSORequired = "sso_required"
)

// Alcance de tiendas de un miembro.
const (
	StoreAccessAll      = "all"
	StoreAccessSelected = "selected"
)

// Tipos de tienda.
const (
	StorePhysical = "physical"
	StoreVirtual  = "virtual"
)

// Estados de un reclamo.
const (
	ComplaintOpen     = "open"
	ComplaintInReview = "in_review"
	ComplaintResolved = "resolved"
)

var ComplaintStatuses = []string{ComplaintOpen, ComplaintInReview, ComplaintResolved}

// Prioridades de un reclamo.
const (
	PriorityLow    = "low"
	PriorityMedium = "medium"
	PriorityHigh   = "high"
	PriorityUrgent = "urgent"
)

var Priorities = []string{PriorityLow, PriorityMedium, PriorityHigh, PriorityUrgent}

// Tipos de reclamo y de persona.
const (
	ComplaintTypeClaim     = "claim"
	ComplaintTypeComplaint = "complaint"
	PersonNatural          = "natural"
	PersonJuridical        = "juridical"
)

var ComplaintTypes = []string{ComplaintTypeClaim, ComplaintTypeComplaint}
var PersonTypes = []string{PersonNatural, PersonJuridical}

// Tipos de documento de identidad de consumidores y usuarios.
var DocumentTypes = []string{"DNI", "CE", "PASAPORTE"}

// Orden de listados de reclamos.
var ComplaintSorts = []string{"featured", "priority", "newest"}

// Eventos del historial público de un reclamo.
const (
	HistoryEventCreated       = "complaint_created"
	HistoryEventStatusChanged = "status_changed"
	HistoryEventResponse      = "response_added"
)

// Estados de entregas (correo y webhooks).
const (
	DeliverySkipped = "skipped"
	DeliveryQueued  = "queued"
	DeliverySent    = "sent"
	DeliveryFailed  = "failed"
)

// Flujos de correo de un reclamo.
const (
	EmailReceipt  = "receipt"
	EmailResponse = "response"
	EmailAdmin    = "admin"
)

// Exportaciones del libro.
const (
	ExportQueued    = "queued"
	ExportCompleted = "completed"
	ExportFailed    = "failed"
	FormatPDF       = "pdf"
	FormatXLSX      = "xlsx"
)

// Protocolos y propósitos de un intento SSO.
const (
	ProtocolOIDC = "oidc"
	ProtocolSAML = "saml"
	SSOLogin     = "login"
	SSOTest      = "test"
	SSOLink      = "link"
)

// Tipos de token JWT.
const (
	TokenAccess  = "access"
	TokenRefresh = "refresh"
)

// Cookies de sesión.
const (
	CookieAccess  = "open_reclamos_access"
	CookieRefresh = "open_reclamos_refresh"
	CookieSession = "open_reclamos_session"
)

// Tipos MIME usados en respuestas y archivos.
const (
	ContentTypePDF          = "application/pdf"
	ContentTypeXLSX         = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	ContentTypeSAMLMetadata = "application/samlmetadata+xml"
	ContentTypeJSON         = "application/json"
	ContentTypePNG          = "image/png"
	ContentTypeJPEG         = "image/jpeg"
)
