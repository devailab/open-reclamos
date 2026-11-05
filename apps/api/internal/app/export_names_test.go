package app

import (
	"context"
	"mime"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"gorm.io/gorm"
	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestExportNamesComeFromServer(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, header := ssoTestService(t, db)
		ctx := context.Background()
		s.Storage.Config.StorageLocalDir = t.TempDir()

		for _, tc := range []struct {
			format, storeName, safeName string
		}{
			{"pdf", "Tienda Principal", "Tienda Principal"},
			{"xlsx", "Sucursal Ñandú / Principal", "Sucursal Ñandú - Principal"},
		} {
			store, err := s.Repo.CreateStore(ctx, repository.CreateStoreParams{
				ID: utils.NewID(), OrganizationID: p.OrganizationID, Slug: "store-" + utils.NewID(),
				Name: tc.storeName, Type: "virtual", Color: "#2563EB",
			})
			if err != nil {
				t.Fatal(err)
			}

			filters := map[string]any{
				"store_id": store.ID, "date_start": "2026-10-01", "date_end": "2026-10-29",
				"_file_name": "nombre-falso.pdf", "store_name": "Tienda falsa",
			}
			out, err := s.Call(ctx, "ExportBook", operation.Input{
				Data: map[string]any{"format": tc.format, "file_name": "nombre-falso.pdf"}, Filters: filters,
			}, header)
			if err != nil {
				t.Fatal(err)
			}

			want := "Libro de Reclamaciones - " + tc.safeName + " - 2026-10-01 al 2026-10-29." + tc.format
			if out.FileName != want || len(out.Document) == 0 {
				t.Fatalf("nombre RPC: %q; esperado: %q", out.FileName, want)
			}

			if err := complaintutils.ValidateFilters(filters); err != nil {
				t.Fatal(err)
			}

			id := utils.NewID()
			key := "exports/" + p.OrganizationID + "/" + id + "." + tc.format

			if err := s.Storage.Put(ctx, key, out.ContentType, out.Document); err != nil {
				t.Fatal(err)
			}

			if err := s.Repo.CreateExport(ctx, repository.CreateExportParams{
				ID: id, OrganizationID: p.OrganizationID, UserID: p.UserID,
				StoreIds: []string{store.ID}, Filters: utils.JSONBytes(filters), Format: tc.format,
				ExpiresAt: time.Now().Add(time.Hour),
			}); err != nil {
				t.Fatal(err)
			}

			if _, err := s.Repo.SetExportResult(ctx, repository.SetExportResultParams{
				ID: id, OrganizationID: p.OrganizationID, Status: "completed", StorageKey: &key,
			}); err != nil {
				t.Fatal(err)
			}

			request := httptest.NewRequest(http.MethodGet, "/api/exports/"+id, nil)
			request.Header = header.Clone()
			response := httptest.NewRecorder()
			s.Handler("test").ServeHTTP(response, request)

			_, params, err := mime.ParseMediaType(response.Header().Get("Content-Disposition"))
			if response.Code != http.StatusOK || err != nil || params["filename"] != want {
				t.Fatalf("nombre HTTP: status=%d, nombre=%q, error=%v", response.Code, params["filename"], err)
			}

			restricted := p
			restricted.AllStores = false
			restricted.StoreIDs = nil

			if _, err := s.Complaints.Documents.BookFileName(ctx, restricted, operation.Input{Filters: filters}); err == nil {
				t.Fatal("se leyó el nombre de una tienda sin acceso")
			}

			foreign := p
			foreign.OrganizationID = utils.NewID()

			if _, err := s.Complaints.Documents.BookFileName(ctx, foreign, operation.Input{Filters: filters}); err == nil {
				t.Fatal("se leyó el nombre de una tienda de otra empresa")
			}
		}
	})
}
