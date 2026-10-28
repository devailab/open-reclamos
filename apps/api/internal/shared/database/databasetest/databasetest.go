// Package databasetest prepara bases de datos aisladas para pruebas de integración.
// SQLite se prueba siempre; PostgreSQL cuando TEST_DATABASE_URL está configurada.
package databasetest

import (
	"context"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/database"
)

type Options struct {
	// SkipMigrations entrega la base vacía, sin esquema ni catálogos.
	SkipMigrations bool
	SkipSeed       bool
}

// Drivers devuelve los motores disponibles en este entorno de pruebas.
func Drivers() []string {
	drivers := []string{database.DriverSQLite}

	if os.Getenv("TEST_DATABASE_URL") != "" {
		drivers = append(drivers, database.DriverPostgres)
	}

	return drivers
}

// Run ejecuta la prueba una vez por motor, con una base nueva en cada subprueba.
func Run(t *testing.T, options Options, fn func(t *testing.T, db *gorm.DB)) {
	for _, driver := range Drivers() {
		t.Run(driver, func(t *testing.T) { fn(t, Open(t, driver, options)) })
	}
}

// Open crea una base exclusiva para la prueba y la elimina al terminar.
func Open(t *testing.T, driver string, options Options) *gorm.DB {
	t.Helper()

	ctx := context.Background()
	cfg := config.Config{DatabaseDriver: driver}

	if driver == database.DriverSQLite {
		cfg.SQLitePath = filepath.Join(t.TempDir(), "open-reclamos.db")
	} else {
		cfg.DatabaseURL = createPostgresDatabase(t)
	}

	db, err := database.Open(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = database.Close(db) })

	if options.SkipMigrations {
		return db
	}

	if err = database.Migrate(ctx, db); err != nil {
		t.Fatal(err)
	}

	if !options.SkipSeed {
		if err = database.Seed(ctx, db); err != nil {
			t.Fatal(err)
		}
	}

	return db
}

func createPostgresDatabase(t *testing.T) string {
	t.Helper()

	ctx := context.Background()
	base := os.Getenv("TEST_DATABASE_URL")
	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatal(err)
	}

	defer admin.Close(ctx)

	name := "open_reclamos_test_" + strings.ReplaceAll(uuid.NewString()[:8], "-", "")
	identifier := pgx.Identifier{name}.Sanitize()

	if _, err = admin.Exec(ctx, "CREATE DATABASE "+identifier); err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		conn, err := pgx.Connect(context.Background(), base)
		if err != nil {
			return
		}

		defer conn.Close(context.Background())

		_, _ = conn.Exec(context.Background(), "DROP DATABASE "+identifier+" WITH (FORCE)")
	})

	dsn, err := url.Parse(base)
	if err != nil {
		t.Fatal(err)
	}

	dsn.Path = "/" + name

	return dsn.String()
}
