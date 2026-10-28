package app

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestEditableSlugsAndSeparatedUserNames(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		s, p, header := ssoTestService(t, db)

		call := func(method, id string, data map[string]any) map[string]any {
			t.Helper()

			out, err := s.Call(ctx, method, operation.Input{ID: id, Data: data}, header)
			if err != nil {
				t.Fatal(method, err)
			}

			return utils.PublicData(out.Data)
		}

		store := call("CreateStore", "", map[string]any{"name": "Tienda Principal", "type": "virtual", "color": "#2563EB"})
		id := store["id"].(string)
		if store["slug"] != "tienda-principal" {
			t.Fatal("el slug debe partir del nombre", store["slug"])
		}

		if call("SuggestStoreSlug", "", map[string]any{"slug": "tienda-principal"})["available"] != false {
			t.Fatal("se ofreció un slug ocupado")
		}
		if call("SuggestStoreSlug", id, map[string]any{"slug": "tienda-principal"})["available"] != true {
			t.Fatal("la tienda debe poder conservar su propio slug")
		}

		call("UpdateStore", id, map[string]any{"slug": "tienda-miraflores", "name": "Tienda Principal", "type": "virtual", "color": "#2563EB"})
		if _, err := s.Repo.GetPublicStore(ctx, "tienda-principal"); err == nil {
			t.Fatal("la URL anterior de la tienda todavía resuelve")
		}
		if _, err := s.Repo.GetPublicStore(ctx, "tienda-miraflores"); err != nil {
			t.Fatal("la nueva URL no resuelve", err)
		}

		_, err := s.Call(ctx, "CreateStore", operation.Input{Data: map[string]any{
			"slug": "tienda-miraflores", "name": "Otra tienda", "type": "virtual", "color": "#2563EB",
		}}, header)
		if connect.CodeOf(err) != connect.CodeFailedPrecondition {
			t.Fatal("se permitió duplicar el slug", err)
		}

		organization, err := s.Repo.GetOrganization(ctx, p.OrganizationID)
		if err != nil {
			t.Fatal(err)
		}

		call("UpdateOrganization", "", map[string]any{
			"slug": "empresa-renombrada", "name": organization.Name, "legal_name": organization.LegalName,
			"ubigeo_id": organization.UbigeoID, "address_type": organization.AddressType, "address": organization.Address,
		})
		if _, err = s.Repo.GetPublicOrganization(ctx, organization.Slug); err == nil {
			t.Fatal("la URL anterior de la organización todavía resuelve")
		}
		if _, err = s.Repo.GetPublicOrganization(ctx, "empresa-renombrada"); err != nil {
			t.Fatal("la nueva URL de la organización no resuelve", err)
		}

		call("UpdateProfile", "", map[string]any{"name": "Ana María", "last_name": "Pérez García"})
		user := call("GetSession", "", nil)["user"].(map[string]any)
		if user["name"] != "Ana María" || user["last_name"] != "Pérez García" {
			t.Fatal("la sesión no conservó nombres y apellidos separados", user)
		}

		created := call("CreateOrganization", "", map[string]any{
			"slug": "empresa-setup", "tax_id": "20345678901", "name": "Nueva empresa", "legal_name": "Nueva empresa SAC",
			"ubigeo_id": organization.UbigeoID, "address_type": organization.AddressType, "address": organization.Address,
			"initial_store": map[string]any{"name": "Primera tienda", "slug": "primera-tienda-elegida", "type": "virtual", "color": "#2563EB"},
		})
		initialStore, err := s.Repo.GetPublicStore(ctx, "primera-tienda-elegida")
		if err != nil || initialStore.OrganizationID != created["id"] {
			t.Fatal("no se respetó el slug elegido en el setup", err)
		}

		_, err = s.Call(ctx, "CreateOrganization", operation.Input{Data: map[string]any{
			"slug": "setup-duplicado", "tax_id": "20345678902", "name": "Otra empresa", "legal_name": "Otra empresa SAC",
			"ubigeo_id": organization.UbigeoID, "address_type": organization.AddressType, "address": organization.Address,
			"initial_store": map[string]any{"name": "Primera tienda", "slug": "primera-tienda-elegida", "type": "virtual", "color": "#2563EB"},
		}}, header)
		if connect.CodeOf(err) != connect.CodeFailedPrecondition {
			t.Fatal("el setup aceptó un slug de tienda ocupado", err)
		}
		if _, err = s.Repo.GetPublicOrganization(ctx, "setup-duplicado"); err == nil {
			t.Fatal("el setup dejó una organización parcial tras el conflicto de slug")
		}
	})
}
