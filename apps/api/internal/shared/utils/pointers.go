package utils

// Value devuelve el valor apuntado o el valor cero si el puntero es nil.
func Value[T any](v *T) T {
	var zero T

	if v == nil {
		return zero
	}

	return *v
}

// Ptr devuelve nil para textos vacíos, útil en columnas opcionales.
func Ptr(v string) *string {
	if v == "" {
		return nil
	}

	return &v
}
