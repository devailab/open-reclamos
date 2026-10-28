// Package rpc conecta las operaciones RPC del módulo de catálogos con sus features.
package rpc

import (
	"openreclamos.com/api/internal/modules/catalogs/feature/categories"
	"openreclamos.com/api/internal/modules/catalogs/feature/locations"
	"openreclamos.com/api/internal/modules/catalogs/feature/reasons"
	"openreclamos.com/api/internal/modules/catalogs/feature/stores"
	. "openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

func Register(
	r *operation.Registry,
	locations *locations.Feature,
	stores *stores.Feature,
	reasons *reasons.Feature,
	categories *categories.Feature,
) {
	r.Public(OpListCountries, locations.ListCountries)
	r.Public(OpListUbigeos, locations.ListUbigeos)

	r.Global(OpSuggestStoreSlug, stores.SuggestSlug)
	r.Tenant(OpListStores, PermissionRead, stores.List)
	r.Tenant(OpGetStore, PermissionRead, stores.Get)
	r.Tenant(OpCreateStore, PermissionAdmin, stores.Create)
	r.Tenant(OpUpdateStore, PermissionAdmin, stores.Update)
	r.Tenant(OpDeactivateStore, PermissionAdmin, stores.Deactivate)
	r.Tenant(OpSetStoreFormEnabled, PermissionAdmin, stores.SetFormEnabled)

	r.Tenant(OpListReasons, PermissionRead, reasons.List)
	r.Tenant(OpCreateReason, PermissionAdmin, reasons.Save)
	r.Tenant(OpUpdateReason, PermissionAdmin, reasons.Save)
	r.Tenant(OpDeleteReason, PermissionAdmin, reasons.Delete)

	r.Tenant(OpListCategories, PermissionRead, categories.List)
	r.Tenant(OpCreateCategory, PermissionAdmin, categories.Save)
	r.Tenant(OpUpdateCategory, PermissionAdmin, categories.Save)
	r.Tenant(OpDeleteCategory, PermissionAdmin, categories.Delete)
}
