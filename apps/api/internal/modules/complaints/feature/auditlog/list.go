package auditlog

import (
	"context"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/pagination"
	"openreclamos.com/api/internal/shared/utils"
)

// List pagina la auditoría con filtros por entidad, usuario, acción y fechas.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	for _, field := range []string{"entity_id", "user_id"} {
		if id := utils.Text(in.Filters, field); id != "" && !utils.ValidID(id) {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidIdentifier)
		}
	}

	if err := complaintutils.NormalizeDateFilters(in.Filters); err != nil {
		return operation.Output{}, err
	}

	filter := repository.AuditFilter{
		AllStores:      p.AllStores,
		StoreIds:       p.StoreIDs,
		OrganizationID: p.OrganizationID,
		EntityID:       utils.Text(in.Filters, "entity_id"),
		EntityType:     utils.Text(in.Filters, "entity_type"),
		UserID:         utils.Text(in.Filters, "user_id"),
		Action:         utils.Text(in.Filters, "action"),
		DateStart:      complaintutils.FilterTime(in.Filters, "date_start"),
		DateEnd:        complaintutils.FilterTime(in.Filters, "date_end"),
		PageSize:       in.PageSize,
		PageOffset:     pagination.Offset(in.Page, in.PageSize),
	}

	rows, err := f.deps.Repo.SearchAudit(ctx, filter)
	if err != nil {
		return operation.Output{}, err
	}

	total, err := f.deps.Repo.CountAudit(ctx, filter)

	return operation.Page(rows, total, in), err
}
