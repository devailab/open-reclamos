package utils

import (
	"encoding/base64"
	"encoding/json"
	"slices"
	"strings"
)

// Bool lee un booleano del mapa recibido por RPC.
func Bool(d map[string]any, key string) bool { v, _ := d[key].(bool); return v }

// Number lee un número entero del mapa recibido por RPC.
func Number(d map[string]any, key string) int { v, _ := d[key].(float64); return int(v) }

// StringList lee una lista de textos e ignora los elementos que no son texto.
func StringList(d map[string]any, key string) []string {
	a, _ := d[key].([]any)
	out := []string{}

	for _, v := range a {
		if s, ok := v.(string); ok {
			out = append(out, s)
		}
	}

	return out
}

// JSONBytes serializa v; nil se guarda como NULL.
func JSONBytes(v any) []byte {
	if v == nil {
		return nil
	}

	b, _ := json.Marshal(v)

	return b
}

// Columnas JSON que GORM entrega como base64 y deben devolverse decodificadas.
var jsonColumns = []string{"events", "mcp_enabled_tools", "request_body", "old_data", "new_data"}

// PublicData convierte cualquier valor en el mapa JSON que recibe el cliente.
func PublicData(v any) map[string]any {
	if v == nil {
		return map[string]any{}
	}

	raw, _ := json.Marshal(v)
	decoder := json.NewDecoder(strings.NewReader(string(raw)))

	decoder.UseNumber()

	var out map[string]any
	if decoder.Decode(&out) != nil {
		return map[string]any{}
	}

	normalizeJSON(out)

	return out
}

func normalizeJSON(v any) {
	switch data := v.(type) {
	case map[string]any:
		for key, value := range data {
			if number, ok := value.(json.Number); ok {
				if key == "amount" {
					data[key] = number.String()
				} else {
					data[key], _ = number.Float64()
				}
			}

			if raw, ok := value.(string); ok && slices.Contains(jsonColumns, key) {
				if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil {
					var parsed any
					if json.Unmarshal(decoded, &parsed) == nil {
						data[key] = parsed
					}
				}
			}

			normalizeJSON(data[key])
		}

	case []any:
		for _, record := range data {
			normalizeJSON(record)
		}
	}
}
