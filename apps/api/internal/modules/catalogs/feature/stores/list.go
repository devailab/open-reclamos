package stores

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// List devuelve las tiendas visibles para el principal.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	status := utils.Text(in.Filters, "status")

	stores, err := f.deps.Repo.ListStores(
		ctx,
		repository.ListStoresParams{
			OrganizationID:  p.OrganizationID,
			IncludeInactive: utils.Bool(in.Filters, "include_inactive") || status == "all" || status == "inactive",
			AllStores:       p.AllStores,
			StoreIds:        p.StoreIDs,
		},
	)

	return operation.Rows(stores, in), err
}
