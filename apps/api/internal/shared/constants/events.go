package constants

// Acciones registradas en la auditoría.
const (
	AuditPlatformInstalled   = "platform.installed"
	AuditPasswordRecovered   = "account.password_recovered"
	AuditSSORecovered        = "sso.recovered"
	AuditSSOConfigured       = "sso.configured"
	AuditSSOPolicyUpdated    = "sso.policy_updated"
	AuditSSOPrefix           = "sso."
	AuditOrganizationCreated = "organization.created"
	AuditOrganizationUpdated = "organization.updated"
	AuditSettingsUpdated     = "organization.settings_updated"
	AuditOrganizationStatus  = "organization.status_changed"
	AuditMemberUpdated       = "member.updated"
	AuditMemberRemoved       = "member.removed"
	AuditInvitationCreated   = "invitation.created"
	AuditInvitationAccepted  = "invitation.accepted"
	AuditStoreCreated        = "store.created"
	AuditStoreUpdated        = "store.updated"
	AuditStoreDeactivated    = "store.deactivated"
	AuditReasonSaved         = "reason.saved"
	AuditReasonDeleted       = "reason.deleted"
	AuditCategorySaved       = "category.saved"
	AuditCategoryDeleted     = "category.deleted"
	AuditWebhookSaved        = "webhook.saved"
	AuditComplaintCreated    = "complaint.created"
	AuditComplaintStatus     = "complaint.status_changed"
	AuditComplaintUpdated    = "complaint.updated"
	AuditComplaintResponded  = "complaint.responded"
)

// Tipos de entidad auditada.
const (
	EntityAuth          = "auth"
	EntityUser          = "user"
	EntityOrganization  = "organization"
	EntityInvitation    = "invitation"
	EntityStore         = "store"
	EntityReason        = "reason"
	EntityCategory      = "category"
	EntityWebhook       = "webhook"
	EntityComplaint     = "complaint"
	EntitySSOConnection = "sso_connection"
)

// Eventos que pueden emitir los webhooks.
const (
	EventComplaintSubmitted     = "complaint.submitted"
	EventComplaintStatusChanged = "complaint.status_changed"
	EventComplaintResponded     = "complaint.responded"
	EventComplaintUpdated       = "complaint.updated"
)

var WebhookEvents = []string{
	EventComplaintSubmitted,
	EventComplaintStatusChanged,
	EventComplaintResponded,
	EventComplaintUpdated,
}

// Herramientas MCP habilitables por empresa.
const (
	ToolListComplaints       = "list_complaints"
	ToolGetComplaint         = "get_complaint"
	ToolListStores           = "list_stores"
	ToolListReasons          = "list_complaint_reasons"
	ToolGetOrganizationStats = "get_organization_stats"
)

var MCPTools = []string{
	ToolListComplaints,
	ToolGetComplaint,
	ToolListStores,
	ToolListReasons,
	ToolGetOrganizationStats,
}
