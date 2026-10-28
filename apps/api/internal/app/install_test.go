package app

import (
	"context"
	"sync"
	"testing"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/database"
	"openreclamos.com/api/internal/shared/database/databasetest"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestFreshInstallationSeparatesSchemaSeedsAndFirstAdministrator(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		var count int64

		if err := db.Table("countries").Count(&count).Error; err != nil || count != 0 {
			t.Fatal("migrate no debe insertar catálogos", count, err)
		}

		for i := 0; i < 2; i++ {
			if err := database.Seed(ctx, db); err != nil {
				t.Fatal(err)
			}
		}

		if err := db.Table("ubigeos").Count(&count).Error; err != nil || count < 1800 {
			t.Fatal("seed no insertó los ubigeos", count, err)
		}

		s := New(db, config.Config{PublicBaseURL: "http://localhost:8080", AllowPublicRegistration: false})
		status, err := s.Call(ctx, "GetInstallationStatus", operation.Input{}, nil)
		if err != nil || utils.PublicData(status.Data)["installed"] != false {
			t.Fatal("estado inicial incorrecto", err)
		}

		if _, err = s.Call(ctx, "Register", operation.Input{Data: map[string]any{"name": "Normal", "last_name": "Prueba", "email": "normal@example.com", "password": "Password-seguro-2026", "document_type": "DNI", "document_number": "00012345"}}, nil); connect.CodeOf(
			err,
		) != connect.CodePermissionDenied {
			t.Fatal("registro cerrado incorrecto", err)
		}

		s.Config.AllowPublicRegistration = true

		if _, err = s.Call(ctx, "Register", operation.Input{Data: map[string]any{"name": "Normal", "last_name": "Prueba", "email": "normal@example.com", "password": "Password-seguro-2026", "document_type": "DNI", "document_number": "00012345"}}, nil); connect.CodeOf(
			err,
		) != connect.CodeFailedPrecondition {
			t.Fatal("registro público eludió install", err)
		}

		s.Config.AllowPublicRegistration = false

		type result struct {
			Output operation.Output
			Error  error
		}

		results := make(chan result, 2)
		var wait sync.WaitGroup

		for _, email := range []string{"first@example.com", "second@example.com"} {
			wait.Add(1)

			go func() {
				defer wait.Done()

				out, err := s.Call(
					ctx,
					"Install",
					operation.Input{
						Data: map[string]any{
							"name": "Administrador", "last_name": "Prueba",
							"email":           email,
							"password":        "Password-seguro-2026",
							"document_type":   "DNI",
							"document_number": email,
						},
					},
					nil,
				)

				results <- result{out, err}
			}()
		}

		wait.Wait()
		close(results)

		success, conflicts := 0, 0
		var installed operation.Output

		for result := range results {
			if result.Error == nil {
				success++
				installed = result.Output
			} else if connect.CodeOf(result.Error) == connect.CodeFailedPrecondition {
				conflicts++
			} else {
				t.Fatal(result.Error)
			}
		}

		if success != 1 || conflicts != 1 {
			t.Fatal("debe instalar solo un administrador", success, conflicts)
		}

		users, err := s.Repo.CountUsers(ctx)
		if err != nil || users != 1 {
			t.Fatal("install dejó cuentas extra", users, err)
		}

		header := accessTokenHeader(installed)
		principal, err := s.Auth.Authenticate(ctx, header)
		if err != nil || !principal.IsPlatform {
			t.Fatal("install no inició la sesión de plataforma", err)
		}

		user, err := s.Repo.GetUserByEmail(ctx, principal.Session.Email)
		if err != nil || !user.EmailVerified {
			t.Fatal("primer administrador no verificado", err)
		}

		if _, err = s.Call(ctx, "Install", operation.Input{Data: map[string]any{"name": "Otro", "last_name": "Prueba", "email": "other@example.com", "password": "Password-seguro-2026", "document_type": "DNI", "document_number": "00012345"}}, nil); connect.CodeOf(
			err,
		) != connect.CodeFailedPrecondition {
			t.Fatal("install no se cerró", err)
		}
	})
}
