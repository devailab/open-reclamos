package app

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestExportFormatStoredAsText(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, principal, header := ssoTestService(t, db)
		ctx := context.Background()

		if db.Migrator().HasConstraint("exports", "exports_format_check") {
			t.Fatal("el formato no debe tener una lista de valores en la base")
		}

		for _, exportFormat := range []string{"pdf", "xlsx", "csv", "custom"} {
			id := utils.NewID()

			err := s.Repo.CreateExport(ctx, repository.CreateExportParams{
				ID: id, OrganizationID: principal.OrganizationID, UserID: principal.UserID,
				StoreIds: []string{}, Filters: utils.JSONBytes(map[string]any{}),
				Format: exportFormat, ExpiresAt: time.Now().Add(time.Hour),
			})
			if err != nil {
				t.Fatalf("la base rechazó el texto %q: %v", exportFormat, err)
			}

			export, err := s.Repo.GetExport(ctx, repository.GetExportParams{ID: id, OrganizationID: principal.OrganizationID})
			if err != nil || export.Format != exportFormat {
				t.Fatalf("no se conservó el formato %q: %v", exportFormat, err)
			}
		}

		// la aplicación sigue validando los formatos que sabe generar.
		_, err := s.Call(ctx, "ExportBook", operation.Input{Data: map[string]any{"format": "custom"}}, header)
		if connect.CodeOf(err) != connect.CodeInvalidArgument {
			t.Fatalf("la aplicación debe rechazar un formato no soportado: %v", err)
		}
	})
}
