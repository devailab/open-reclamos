package documents

import (
	"testing"
	"time"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
)

func TestBookFileNameDates(t *testing.T) {
	now := time.Date(2026, 10, 30, 2, 0, 0, 0, time.UTC)

	for _, tc := range []struct {
		name, start, end, want string
	}{
		{"rango inclusivo", "2026-10-01", "2026-10-29", "2026-10-01 al 2026-10-29"},
		{"un solo día", "2026-10-29", "2026-10-29", "2026-10-29"},
		{"fechas UTC equivalentes", "2026-10-01T05:00:00Z", "2026-10-30T05:00:00Z", "2026-10-01 al 2026-10-29"},
		{"sin rango usa la fecha de Lima", "", "", "2026-10-29"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			filters := map[string]any{"date_start": tc.start, "date_end": tc.end}

			if err := complaintutils.ValidateFilters(filters); err != nil {
				t.Fatal(err)
			}

			want := "Libro de Reclamaciones - Tienda Principal - " + tc.want + ".pdf"

			if got := bookFileName("Tienda Principal", filters, "pdf", now); got != want {
				t.Fatalf("nombre: %q; esperado: %q", got, want)
			}
		})
	}
}
