package documents

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// usa la tienda del servidor y las fechas ya validadas.
func (f *Feature) BookFileName(ctx context.Context, p auth.Principal, in operation.Input) (string, error) {
	storeName := "Todas las tiendas"

	if storeID := utils.FilterText(in.Filters, "store_id"); storeID != "" {
		if !p.CanStore(storeID) {
			return "", apperrors.Denied()
		}

		store, err := f.deps.Repo.GetHistoricalStore(
			ctx,
			repository.GetStoreParams{ID: storeID, OrganizationID: p.OrganizationID},
		)
		if err != nil {
			return "", err
		}

		storeName = store.Name
	}

	format := utils.Text(in.Data, "format")
	if format == "" {
		format = constants.FormatPDF
	}

	return bookFileName(storeName, in.Filters, format, time.Now()), nil
}

func bookFileName(storeName string, filters map[string]any, format string, now time.Time) string {
	name := strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || strings.ContainsRune(`<>:"/\|?*`, r) {
			return '-'
		}

		return r
	}, storeName)
	name = strings.Join(strings.Fields(name), " ")

	dates := bookDates(filters, now)

	return fmt.Sprintf("Libro de Reclamaciones - %s - %s.%s", name, dates, format)
}

func bookDates(filters map[string]any, now time.Time) string {
	start := complaintutils.FilterTime(filters, "date_start")
	end := complaintutils.FilterTime(filters, "date_end")
	dates := now.In(utils.LimaZone).Format(time.DateOnly)

	if start != nil {
		dates = "desde " + start.In(utils.LimaZone).Format(time.DateOnly)
	}

	if end != nil {
		// el filtro final es exclusivo; el nombre muestra el último día incluido.
		lastDate := end.Add(-time.Nanosecond).In(utils.LimaZone).Format(time.DateOnly)
		dates = "hasta " + lastDate

		if start != nil {
			firstDate := start.In(utils.LimaZone).Format(time.DateOnly)
			dates = firstDate

			if firstDate != lastDate {
				dates += " al " + lastDate
			}
		}
	}

	return dates
}
