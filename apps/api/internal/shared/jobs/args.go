package jobs

// EmailArgs envía la constancia, la respuesta o el aviso a administradores de un reclamo.
type EmailArgs struct {
	OrganizationID string `json:"organization_id"`
	ComplaintID    string `json:"complaint_id"`
	Workflow       string `json:"workflow"`
}

func (EmailArgs) Kind() string { return "complaint_email" }

// WebhookArgs entrega una fila de webhook_deliveries.
type WebhookArgs struct {
	OrganizationID string `json:"organization_id"`
	DeliveryID     string `json:"delivery_id"`
}

func (WebhookArgs) Kind() string { return "deliver_webhook" }

// ExportArgs genera una exportación asíncrona del libro.
type ExportArgs struct {
	OrganizationID string `json:"organization_id"`
	ExportID       string `json:"export_id"`
}

func (ExportArgs) Kind() string { return "export_book" }

// DeleteObjectArgs borra un archivo del almacenamiento.
type DeleteObjectArgs struct {
	Key string `json:"key"`
}

func (DeleteObjectArgs) Kind() string { return "delete_object" }

// CleanupArgs elimina uploads, sesiones, exportaciones e intentos vencidos.
type CleanupArgs struct{}

func (CleanupArgs) Kind() string { return "cleanup" }
