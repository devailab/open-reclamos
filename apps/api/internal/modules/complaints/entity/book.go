// Package entity define la forma de presentar los reclamos en el libro y sus documentos.
package entity

import (
	"fmt"
	"slices"
	"time"

	"openreclamos.com/api/internal/shared/utils"
)

// BookColumn es una columna del libro de reclamaciones exportado.
type BookColumn struct{ Key, Label string }

// BookColumns son las columnas del libro en PDF y Excel, en orden.
var BookColumns = []BookColumn{
	{"correlative", "Correlativo"},
	{"tracking_code", "Código"},
	{"created_at", "Fecha de registro"},
	{"store_name", "Tienda"},
	{"type", "Tipo"},
	{"status", "Estado"},
	{"priority", "Prioridad"},
	{"category_name", "Categoría"},
	{"person_type", "Tipo de consumidor"},
	{"first_name", "Nombres"},
	{"last_name", "Apellidos"},
	{"legal_name", "Razón social del consumidor"},
	{"legal_tax_id", "RUC del consumidor"},
	{"document_type", "Tipo de documento"},
	{"document_number", "Documento"},
	{"is_minor", "Menor de edad"},
	{"guardian_first_name", "Nombres del tutor"},
	{"guardian_last_name", "Apellidos del tutor"},
	{"guardian_document_type", "Tipo de documento del tutor"},
	{"guardian_document_number", "Documento del tutor"},
	{"email", "Email"},
	{"dial_code", "Código telefónico"},
	{"phone", "Teléfono"},
	{"address", "Dirección del consumidor"},
	{"item_type", "Tipo de bien"},
	{"item_description", "Descripción del bien"},
	{"currency", "Moneda"},
	{"amount", "Monto"},
	{"has_proof_of_payment", "Tiene comprobante"},
	{"proof_of_payment_type", "Tipo de comprobante"},
	{"proof_of_payment_number", "Número de comprobante"},
	{"incident_date", "Fecha del incidente"},
	{"description", "Descripción"},
	{"request", "Pedido"},
	{"response_deadline_days", "Plazo aplicado (días)"},
	{"response_deadline", "Fecha límite"},
	{"official_response", "Respuesta oficial"},
	{"responded_at", "Fecha de respuesta"},
}

// labels traduce valores de enumeraciones a texto visible.
var labels = map[string]string{
	"claim":     "Reclamo",
	"complaint": "Queja",
	"open":      "Abierto",
	"in_review": "En revisión",
	"resolved":  "Resuelto",
	"natural":   "Natural",
	"juridical": "Jurídica",
	"product":   "Producto",
	"service":   "Servicio",
	"low":       "Baja",
	"medium":    "Media",
	"high":      "Alta",
	"urgent":    "Urgente",
}

// labeledKeys son los campos cuyos valores se traducen con labels.
var labeledKeys = []string{"type", "status", "person_type", "item_type", "priority"}

// DisplayValue formatea un valor del reclamo para documentos (enums, booleanos y fechas).
func DisplayValue(key string, value any) string {
	if value == nil {
		return ""
	}

	if boolean, ok := value.(bool); ok {
		if boolean {
			return "Sí"
		}

		return "No"
	}

	if text, ok := value.(string); ok {
		if slices.Contains(labeledKeys, key) {
			if label, exists := labels[text]; exists {
				return label
			}
		}

		if date, err := time.Parse(time.RFC3339, text); err == nil {
			return date.In(utils.LimaZone).Format("02/01/2006 15:04")
		}

		return text
	}

	return fmt.Sprint(value)
}
