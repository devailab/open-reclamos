package notices

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
)

// Links devuelve los enlaces públicos del libro de la empresa y de cada tienda visible.
func (f *Feature) Links(ctx context.Context, p auth.Principal, _ operation.Input) (operation.Output, error) {
	o, err := f.deps.Repo.GetOrganization(ctx, p.OrganizationID)
	if err != nil {
		return operation.Output{}, err
	}

	stores, err := f.deps.Repo.ListStores(
		ctx,
		repository.ListStoresParams{OrganizationID: p.OrganizationID, AllStores: p.AllStores, StoreIds: p.StoreIDs},
	)

	base := f.deps.Config.PublicBaseURL
	links := []map[string]string{}

	for _, store := range stores {
		links = append(
			links,
			map[string]string{
				"store_id": store.ID,
				"name":     store.Name,
				"url":      base + constants.PathStoreBook + store.Slug,
			},
		)
	}

	return operation.Record(
		map[string]any{"organization_url": base + constants.PathOrganizationBook + o.Slug, "stores": links},
	), err
}
