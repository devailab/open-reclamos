package utils

import (
	"context"
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// Text lee un texto del mapa recibido por RPC, sin espacios en los extremos.
func Text(d map[string]any, key string) string {
	v, _ := d[key].(string)

	return strings.TrimSpace(v)
}

// RawText lee un texto sin recortar (contraseñas, tokens).
func RawText(d map[string]any, key string) string {
	v, _ := d[key].(string)

	return v
}

// FilterText lee un filtro; "all" equivale a no filtrar.
func FilterText(d map[string]any, key string) string {
	if Text(d, key) == "all" {
		return ""
	}

	return Text(d, key)
}

// Required indica si el texto no está vacío y no supera max caracteres.
func Required(v string, max int) bool { return strings.TrimSpace(v) != "" && len([]rune(v)) <= max }

// SlugBase convierte un nombre en un slug ASCII de hasta 80 caracteres.
func SlugBase(name string) string {
	var builder strings.Builder

	for _, r := range norm.NFD.String(strings.ToLower(name)) {
		if unicode.Is(unicode.Mn, r) {
			continue
		}

		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			builder.WriteRune(r)
		} else {
			builder.WriteByte('-')
		}
	}

	slug := strings.Join(strings.FieldsFunc(builder.String(), func(r rune) bool { return r == '-' }), "-")
	if len(slug) > 80 {
		slug = strings.Trim(slug[:80], "-")
	}

	if slug == "" {
		slug = "empresa"
	}

	return slug
}

// UniqueSlug sugiere un slug libre a partir de un nombre usando exists para comprobar duplicados.
func UniqueSlug(ctx context.Context, name string, exists func(context.Context, string) (bool, error)) (string, error) {
	base := SlugBase(name)

	for i := 0; ; i++ {
		if err := ctx.Err(); err != nil {
			return "", err
		}

		candidate := base

		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", base, i)
		}

		taken, err := exists(ctx, candidate)
		if err != nil {
			return "", err
		}

		if !taken {
			return candidate, nil
		}
	}
}
