package utils

import (
	"fmt"

	gonanoid "github.com/matoous/go-nanoid/v2"
)

// trackingAlphabet evita caracteres ambiguos (0/O, 1/I).
const trackingAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

// GenerateTrackingCode crea un código de seguimiento con formato XXXX-XXXXXX.
func GenerateTrackingCode() (string, error) {
	id, err := gonanoid.Generate(trackingAlphabet, 10)
	if err != nil {
		return "", err
	}

	return id[:4] + "-" + id[4:], nil
}

// FormatCorrelative formatea el correlativo por tienda con cuatro dígitos.
func FormatCorrelative(n int32) string { return fmt.Sprintf("%04d", n) }
