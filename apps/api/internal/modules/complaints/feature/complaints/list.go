package complaints

import (
	"context"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// featuredPageSize es la cantidad de reclamos destacados en el dashboard.
const featuredPageSize = 6

// List pagina los reclamos visibles con filtros.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if err := complaintutils.ValidateFilters(in.Filters); err != nil {
		return operation.Output{}, err
	}

	filter := complaintutils.ListFilter(p, in)
	rows, err := f.deps.Repo.ListComplaints(ctx, filter)
	if err != nil {
		return operation.Output{}, err
	}

	total, err := f.deps.Repo.CountComplaints(ctx, filter)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Page(rows, total, in), nil
}

// ListFeatured devuelve los reclamos activos más urgentes.
func (f *Feature) ListFeatured(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	in.Filters["active_only"] = true
	in.Filters["sort"] = "featured"
	in.PageSize = featuredPageSize

	return f.List(ctx, p, in)
}
