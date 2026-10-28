package app

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/riverqueue/river"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/modules/complaints/feature/exports"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestReviewAPIKeyAndSelectedAdminBoundaries(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, header := ssoTestService(t, db)
		ctx := context.Background()

		call := func(method, id string, data map[string]any, want connect.Code) operation.Output {
			t.Helper()

			out, err := s.Call(ctx, method, operation.Input{ID: id, Data: data}, header)
			if want == 0 && err != nil {
				t.Fatal(method, err)
			}

			if want != 0 && connect.CodeOf(err) != want {
				t.Fatalf("%s: esperado %v, recibido %v", method, want, err)
			}

			return out
		}

		storeData := map[string]any{"name": "Tienda", "type": "virtual", "color": "#2563EB"}
		a := utils.PublicData(call("CreateStore", "", storeData, 0).Data)["id"].(string)
		b := utils.PublicData(call("CreateStore", "", storeData, 0).Data)["id"].(string)
		key := utils.PublicData(call("CreateAPIKey", "", map[string]any{"name": "Integración"}, 0).Data)["api_key"].(string)
		apiHeader := http.Header{"Authorization": []string{"Bearer " + key}}

		if _, err := s.Call(ctx, "ListOrganizations", operation.Input{}, apiHeader); connect.CodeOf(
			err,
		) != connect.CodePermissionDenied {
			t.Fatal("la clave API obtuvo información global", err)
		}

		if _, err := s.Call(ctx, "CreateAPIKey", operation.Input{Data: map[string]any{"name": "Persistencia"}}, apiHeader); connect.CodeOf(
			err,
		) != connect.CodePermissionDenied {
			t.Fatal("la clave API pudo emitir otra clave", err)
		}

		if _, err := s.Auth.Authenticate(ctx, http.Header{"Authorization": []string{key}}); connect.CodeOf(
			err,
		) != connect.CodeUnauthenticated {
			t.Fatal("se aceptó Authorization sin Bearer", err)
		}

		apiPrincipal, err := s.Auth.Authenticate(ctx, apiHeader)
		if err != nil {
			t.Fatal(err)
		}

		if _, err = s.Auth.Tenant(ctx, apiPrincipal, utils.NewID()); connect.CodeOf(
			err,
		) != connect.CodePermissionDenied {
			t.Fatal("se pudo cambiar el tenant de la clave API", err)
		}

		call(
			"UpdateUserAccess",
			p.UserID,
			map[string]any{"role": "admin", "store_access_mode": "selected", "store_ids": []any{a}},
			0,
		)

		call("UpdateStore", b, storeData, connect.CodePermissionDenied)
		call("DeactivateStore", b, nil, connect.CodePermissionDenied)
		call("SetStoreFormEnabled", b, map[string]any{"form_enabled": false}, connect.CodePermissionDenied)

		call(
			"UpdateUserAccess",
			p.UserID,
			map[string]any{"role": "admin", "store_access_mode": "all"},
			connect.CodePermissionDenied,
		)

		call(
			"CreateInvitation",
			"",
			map[string]any{
				"email":             "invite@example.com",
				"role":              "viewer",
				"store_access_mode": "selected",
				"store_ids":         []any{b},
			},
			connect.CodePermissionDenied,
		)

		created := utils.PublicData(call("CreateStore", "", storeData, 0).Data)["id"].(string)

		call("GetStore", created, nil, 0)

		audits := utils.PublicData(call("ListAudit", "", nil, 0).Data)["rows"].([]any)

		for _, row := range audits {
			entry := row.(map[string]any)
			if entry["entity_id"] == b {
				t.Fatal("la auditoría expuso otra tienda")
			}
		}
	})
}

func TestReviewPasswordsPreserveSpacesAndSerializeChanges(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, _, _ := ssoTestService(t, db)
		ctx := context.Background()
		password := "  contraseña-literal-con-espacios  "
		email := "password-" + utils.NewID() + "@example.com"

		_, err := s.Identity.Session.CreateAccount(
			ctx,
			operation.Input{
				Data: map[string]any{
					"name": "Literal", "last_name": "Prueba",
					"email":           email,
					"password":        password,
					"document_type":   "CE",
					"document_number": utils.NewID()[:20],
				},
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		if _, err = s.Call(ctx, "Login", operation.Input{Data: map[string]any{"email": email, "password": strings.TrimSpace(password)}}, nil); connect.CodeOf(
			err,
		) != connect.CodeUnauthenticated {
			t.Fatal("se modificaron espacios de la contraseña", err)
		}

		login, err := s.Call(
			ctx,
			"Login",
			operation.Input{Data: map[string]any{"email": email, "password": password}},
			nil,
		)
		if err != nil {
			t.Fatal(err)
		}

		header := accessTokenHeader(login)
		var wait sync.WaitGroup
		results := make(chan error, 2)

		for _, replacement := range []string{"  nueva-contraseña-uno  ", "  nueva-contraseña-dos  "} {
			wait.Add(1)

			go func() {
				defer wait.Done()

				_, err := s.Call(
					ctx,
					"ChangePassword",
					operation.Input{Data: map[string]any{"current_password": password, "new_password": replacement}},
					header,
				)

				results <- err
			}()
		}

		wait.Wait()
		close(results)

		success, denials := 0, 0

		for err := range results {
			if err == nil {
				success++
			} else if connect.CodeOf(err) == connect.CodeUnauthenticated {
				denials++
			} else {
				t.Fatal(err)
			}
		}

		if success != 1 || denials != 1 {
			t.Fatalf("cambios concurrentes: éxitos=%d rechazos=%d", success, denials)
		}
	})
}

func TestReviewSSOIdentityCannotBeReassigned(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, _ := ssoTestService(t, db)
		ctx := context.Background()

		other, err := s.Repo.CreateUser(
			ctx,
			repository.CreateUserParams{
				ID:   utils.NewID(),
				Name: "Otro", LastName: "Prueba",
				Email: "identity-" + utils.NewID() + "@example.com",
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		if err = s.Repo.CreateMember(ctx, repository.CreateMemberParams{UserID: other.ID, OrganizationID: p.OrganizationID, Role: "viewer", StoreAccessMode: "all"}); err != nil {
			t.Fatal(err)
		}

		connection := utils.NewID()

		if err = s.Repo.InsertSSOConnection(ctx, repository.InsertSSOConnectionParams{ID: connection, OrganizationID: p.OrganizationID, Protocol: "oidc", Name: "Vinculación", CreatedBy: &p.UserID}); err != nil {
			t.Fatal(err)
		}

		params := repository.LinkSSOIdentityParams{
			ID:             utils.NewID(),
			OrganizationID: p.OrganizationID,
			ConnectionID:   connection,
			UserID:         p.UserID,
			Issuer:         "https://issuer.example.com",
			Subject:        "subject",
		}

		if count, err := s.Repo.LinkSSOIdentity(ctx, params); err != nil || count != 1 {
			t.Fatal("no se vinculó la identidad", err)
		}

		params.ID, params.UserID = utils.NewID(), other.ID

		if count, err := s.Repo.LinkSSOIdentity(ctx, params); err != nil || count != 0 {
			t.Fatal("se reasignó una identidad existente", err)
		}
	})
}

func TestReviewCancelledExportPersistsFailure(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, _ := ssoTestService(t, db)
		ctx := context.Background()
		id := utils.NewID()

		if err := s.Repo.CreateExport(ctx, repository.CreateExportParams{ID: id, OrganizationID: p.OrganizationID, UserID: p.UserID, StoreIds: []string{utils.NewID()}, Filters: utils.JSONBytes(map[string]any{}), Format: "xlsx", ExpiresAt: time.Now().Add(time.Hour)}); err != nil {
			t.Fatal(err)
		}

		// Un rol restringido ya no puede acceder a las tiendas del snapshot.
		if _, err := s.Repo.UpdateMember(ctx, repository.UpdateMemberParams{OrganizationID: p.OrganizationID, UserID: p.UserID, Role: "admin", StoreAccessMode: "selected", UpdatedBy: &p.UserID}); err != nil {
			t.Fatal(err)
		}

		worker := exports.Worker{Feature: s.Complaints.Exports}

		if err := worker.Work(ctx, &river.Job[jobs.ExportArgs]{Args: jobs.ExportArgs{OrganizationID: p.OrganizationID, ExportID: id}}); err == nil {
			t.Fatal("el worker generó datos fuera de alcance")
		}

		export, err := s.Repo.GetExport(ctx, repository.GetExportParams{ID: id, OrganizationID: p.OrganizationID})
		if err != nil {
			t.Fatal(err)
		}

		if export.Status != "failed" || export.ErrorMessage == nil {
			t.Fatal("la exportación cancelada quedó pendiente", export.Status)
		}
	})
}
