// Package pagination normaliza páginas y pagina listas en memoria.
package pagination

import (
	"fmt"
	"strings"

	"openreclamos.com/api/internal/shared/utils"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MaxPage         = 100000
)

// Normalize aplica valores por defecto y límites; ok es false si la página excede MaxPage.
func Normalize(page, size int) (int, int, bool) {
	if page < 1 {
		page = 1
	}

	if size < 1 {
		size = DefaultPageSize
	}

	if size > MaxPageSize {
		size = MaxPageSize
	}

	return page, size, page <= MaxPage
}

// Offset devuelve el desplazamiento SQL de la página.
func Offset(page, size int) int { return (page - 1) * size }

// Result es la forma común de una página de resultados.
func Result(rows any, total any, page, size int) map[string]any {
	return map[string]any{"rows": rows, "total": total, "page": page, "page_size": size}
}

// Rows filtra y pagina en memoria una lista completa.
func Rows[T any](items []T, filters map[string]any, page, size int) map[string]any {
	filtered := []map[string]any{}

	for _, item := range items {
		data := utils.PublicData(item)
		if matches(data, filters) {
			filtered = append(filtered, data)
		}
	}

	start := min(Offset(page, size), len(filtered))
	end := min(start+size, len(filtered))

	return Result(filtered[start:end], len(filtered), page, size)
}

func matches(data, filters map[string]any) bool {
	for key, value := range filters {
		requested, ok := value.(string)
		if !ok || requested == "" || requested == "all" {
			continue
		}

		switch key {
		case "search", "name", "reason":
			combined := fmt.Sprint(data["name"], " ", data["reason"], " ", data["email"], " ", data["tax_id"])
			if !strings.Contains(strings.ToLower(combined), strings.ToLower(requested)) {
				return false
			}

		case "level":
			if requested == "root" && data["parent_id"] != nil || requested == "child" && data["parent_id"] == nil {
				return false
			}

		case "status":
			if derivedStatus(data) != requested {
				return false
			}

		default:
			if current, exists := data[key]; exists && current != value {
				return false
			}
		}
	}

	return true
}

// derivedStatus infiere el estado de filas sin columna status (borrado lógico o invitaciones).
func derivedStatus(data map[string]any) any {
	status, exists := data["status"]
	if exists {
		return status
	}

	if deleted, exists := data["deleted_at"]; exists {
		status = "active"

		if deleted != nil {
			status = "inactive"
		}
	}

	if _, exists := data["accepted_at"]; exists {
		status = "pending"

		if data["accepted_at"] != nil {
			status = "accepted"
		}

		if data["revoked_at"] != nil {
			status = "revoked"
		}
	}

	return status
}
