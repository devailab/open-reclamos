package public

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Book devuelve empresa, tiendas y motivos públicos para el formulario (in.ID es el slug).
func (f *Feature) Book(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	slug := in.ID

	if utils.Text(in.Data, "kind") == "store" {
		store, err := f.deps.Repo.GetPublicStore(ctx, slug)
		if err != nil {
			return operation.Output{}, err
		}

		slug = store.OrganizationSlug
	}

	o, err := f.deps.Repo.GetPublicOrganization(ctx, slug)
	if err != nil {
		return operation.Output{}, err
	}

	stores, err := f.deps.Repo.ListStores(ctx, repository.ListStoresParams{OrganizationID: o.ID, AllStores: true})
	if err != nil {
		return operation.Output{}, err
	}

	reasons, err := f.deps.Repo.ListReasons(ctx, o.ID)
	publicStores := []map[string]any{}

	for _, store := range stores {
		publicStores = append(
			publicStores,
			map[string]any{
				"id":           store.ID,
				"slug":         store.Slug,
				"name":         store.Name,
				"type":         store.Type,
				"color":        store.Color,
				"address_type": store.AddressType,
				"address":      store.Address,
				"url":          store.Url,
				"form_enabled": store.FormEnabled,
			},
		)
	}

	publicReasons := []map[string]any{}

	for _, reason := range reasons {
		publicReasons = append(
			publicReasons,
			map[string]any{"id": reason.ID, "parent_id": reason.ParentID, "reason": reason.Reason},
		)
	}

	return operation.Record(
		map[string]any{
			"organization":       o,
			"stores":             publicStores,
			"reasons":            publicReasons,
			"turnstile_enabled":  f.deps.Config.TurnstileEnabled,
			"turnstile_site_key": f.deps.Config.TurnstileSiteKey,
		},
	), err
}
