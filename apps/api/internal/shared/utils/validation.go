package utils

import (
	"net/mail"
	"regexp"

	"github.com/google/uuid"
)

var (
	SlugPattern   = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	ColorPattern  = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
	TaxIDPattern  = regexp.MustCompile(`^[0-9]{11}$`)
	AmountPattern = regexp.MustCompile(`^\d{1,8}(\.\d{1,2})?$`)
	DialPattern   = regexp.MustCompile(`^\+\d{1,4}$`)
)

// ValidID indica si el valor es un UUID canónico.
func ValidID(id string) bool { _, err := uuid.Parse(id); return err == nil && len(id) == 36 }

// ValidEmail indica si el valor es una dirección de correo simple y normalizada.
func ValidEmail(email string) bool {
	a, err := mail.ParseAddress(email)

	return err == nil && a.Address == email && len(email) <= 254
}

// ValidPassword aplica la política de longitud de contraseñas.
func ValidPassword(password string) bool { return len(password) >= 12 && len(password) <= 256 }

// Digits indica si v tiene exactamente n dígitos.
func Digits(v string, n int) bool {
	if len(v) != n {
		return false
	}

	for _, c := range v {
		if c < '0' || c > '9' {
			return false
		}
	}

	return true
}
