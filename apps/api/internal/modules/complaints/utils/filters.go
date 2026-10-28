// Package utils contiene utilidades que solo usa el módulo de reclamos.
package utils

import (
	"slices"
	"time"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/pagination"
	"openreclamos.com/api/internal/shared/utils"
)

// maxSearchLength limita el texto de búsqueda de reclamos.
const maxSearchLength = 120

// ListFilter construye el filtro de repositorio limitado a las tiendas del principal.
func ListFilter(p auth.Principal, in operation.Input) repository.ComplaintFilter {
	return repository.ComplaintFilter{
		OrganizationID: p.OrganizationID,
		AllStores:      p.AllStores,
		StoreIds:       p.StoreIDs,
		StoreFilter:    utils.FilterText(in.Filters, "store_id"),
		Status:         utils.FilterText(in.Filters, "status"),
		Type:           utils.FilterText(in.Filters, "type"),
		Priority:       utils.FilterText(in.Filters, "priority"),
		CategoryFilter: utils.FilterText(in.Filters, "category_id"),
		DateStart:      FilterTime(in.Filters, "date_start"),
		DateEnd:        FilterTime(in.Filters, "date_end"),
		Search:         utils.Text(in.Filters, "search"),
		Overdue:        utils.Bool(in.Filters, "overdue"),
		ActiveOnly:     utils.Bool(in.Filters, "active_only"),
		SortOrder:      utils.Text(in.Filters, "sort"),
		PageSize:       in.PageSize,
		PageOffset:     pagination.Offset(in.Page, in.PageSize),
	}
}

// FilterTime lee una fecha ya validada por NormalizeDateFilters.
func FilterTime(filters map[string]any, key string) *time.Time {
	value, err := time.Parse(time.RFC3339, utils.Text(filters, key))
	if err != nil {
		return nil
	}

	return &value
}

// NormalizeDateFilters acepta RFC3339 o YYYY-MM-DD (hora de Lima; date_end inclusive).
func NormalizeDateFilters(filters map[string]any) error {
	for _, field := range []string{"date_start", "date_end"} {
		value := utils.Text(filters, field)
		if value == "" {
			continue
		}

		date, err := time.Parse(time.RFC3339, value)
		if err != nil {
			date, err = time.ParseInLocation("2006-01-02", value, utils.LimaZone)
			if err == nil && field == "date_end" {
				date = date.AddDate(0, 0, 1)
			}
		}

		if err != nil {
			return apperrors.Invalid(constants.MsgInvalidDate)
		}

		filters[field] = date.Format(time.RFC3339)
	}

	start, end := utils.Text(filters, "date_start"), utils.Text(filters, "date_end")
	if start != "" && end != "" {
		a, _ := time.Parse(time.RFC3339, start)
		b, _ := time.Parse(time.RFC3339, end)
		if a.After(b) {
			return apperrors.Invalid(constants.MsgInvalidDateRange)
		}
	}

	return nil
}

// ValidateFilters revisa referencias, enumeraciones, búsqueda y fechas del listado.
func ValidateFilters(filters map[string]any) error {
	for _, field := range []string{"store_id", "category_id"} {
		if value := utils.FilterText(filters, field); value != "" && !utils.ValidID(value) {
			return apperrors.Invalid(constants.MsgInvalidReference)
		}
	}

	options := map[string][]string{
		"status":   constants.ComplaintStatuses,
		"type":     constants.ComplaintTypes,
		"priority": constants.Priorities,
		"sort":     constants.ComplaintSorts,
	}

	for field, allowed := range options {
		if value := utils.FilterText(filters, field); value != "" && !slices.Contains(allowed, value) {
			return apperrors.Invalid(constants.MsgInvalidFilter)
		}
	}

	if len(utils.Text(filters, "search")) > maxSearchLength {
		return apperrors.Invalid(constants.MsgSearchTooLong)
	}

	return NormalizeDateFilters(filters)
}
