package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// JSON guarda documentos JSON: jsonb en PostgreSQL y texto en SQLite.
type JSON []byte

func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}

	return string(j), nil
}

func (j *JSON) Scan(src any) error {
	switch v := src.(type) {
	case nil:
		*j = nil

	case []byte:
		*j = append(JSON(nil), v...)

	case string:
		*j = JSON(v)

	default:
		return fmt.Errorf("JSON no admite %T", src)
	}

	return nil
}

func (j JSON) MarshalJSON() ([]byte, error) {
	if j == nil {
		return []byte("null"), nil
	}

	return j, nil
}

func (j *JSON) UnmarshalJSON(data []byte) error {
	*j = append(JSON(nil), data...)

	return nil
}

// StringList reemplaza los arreglos nativos de PostgreSQL con un arreglo JSON portable.
type StringList []string

func (l StringList) Value() (driver.Value, error) {
	if l == nil {
		l = StringList{}
	}

	data, err := json.Marshal([]string(l))

	return string(data), err
}

func (l *StringList) Scan(src any) error {
	var raw JSON

	if err := raw.Scan(src); err != nil {
		return err
	}

	if raw == nil {
		*l = nil

		return nil
	}

	return json.Unmarshal(raw, (*[]string)(l))
}

// Decimal conserva importes con dos decimales aunque SQLite los devuelva como REAL.
type Decimal string

func (d Decimal) Value() (driver.Value, error) { return string(d), nil }

func (d *Decimal) Scan(src any) error {
	switch v := src.(type) {
	case float64:
		*d = Decimal(strconv.FormatFloat(v, 'f', 2, 64))

	case int64:
		*d = Decimal(strconv.FormatInt(v, 10) + ".00")

	case []byte:
		*d = normalizeDecimal(string(v))

	case string:
		*d = normalizeDecimal(v)

	default:
		return fmt.Errorf("Decimal no admite %T", src)
	}

	return nil
}

func normalizeDecimal(v string) Decimal {
	whole, fraction, _ := strings.Cut(v, ".")

	return Decimal(whole + "." + (fraction + "00")[:2])
}
