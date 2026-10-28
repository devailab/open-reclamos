package utils

import (
	"regexp"
	"strings"
)

var businessDomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9._-]{0,251}[a-z0-9])?$`)

func NormalizeBusinessDomain(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// también acepta alias cortos, sin exigir un dominio de internet.
func ValidBusinessDomain(value string) bool {
	return value == "" || businessDomainPattern.MatchString(value)
}
