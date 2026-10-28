package utils

import (
	"slices"
	"strings"

	"openreclamos.com/api/internal/shared/constants"
)

// UserDocument lee el documento de identidad de una cuenta desde la petición.
func UserDocument(d map[string]any) (documentType, documentNumber string, ok bool) {
	return NormalizeDocument(Text(d, "document_type"), Text(d, "document_number"))
}

// NormalizeDocument valida tipo y número. El número es texto libre (conserva ceros a la
// izquierda, no se consulta en servicios externos) y va en mayúsculas para que un
// pasaporte no se repita cambiando solo la capitalización.
func NormalizeDocument(documentType, documentNumber string) (string, string, bool) {
	documentType = strings.ToUpper(strings.TrimSpace(documentType))
	documentNumber = strings.ToUpper(strings.TrimSpace(documentNumber))

	return documentType, documentNumber,
		slices.Contains(constants.DocumentTypes, documentType) && Required(documentNumber, 20)
}
