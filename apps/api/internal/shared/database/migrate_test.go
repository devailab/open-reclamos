package database_test

import (
	"context"
	"testing"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database"
	"openreclamos.com/api/internal/shared/database/databasetest"
	"openreclamos.com/api/migrations"
)

func TestMigrationsAndSeed(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipMigrations: true}, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()

		if err := database.Ready(ctx, db); err == nil {
			t.Fatal("una base vacía no debe considerarse lista")
		}

		for range 2 {
			if err := database.Migrate(ctx, db); err != nil {
				t.Fatalf("las migraciones deben ser idempotentes: %v", err)
			}

			if err := database.Seed(ctx, db); err != nil {
				t.Fatalf("el seed debe ser idempotente: %v", err)
			}
		}

		if err := database.Ready(ctx, db); err != nil {
			t.Fatal(err)
		}

		for table, min := range map[string]int64{"roles": 3, "countries": 200, "ubigeos": 1800} {
			var count int64

			if err := db.Table(table).Count(&count).Error; err != nil || count < min {
				t.Fatalf("%s: %d, error %v", table, count, err)
			}
		}
	})
}

func TestMigrationsRollBack(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		migrator := migrations.New(db)

		for range migrations.IDs() {
			if err := migrator.RollbackLast(); err != nil {
				t.Fatal(err)
			}
		}

		if db.Migrator().HasTable("complaints") || db.Migrator().HasTable("users") {
			t.Fatal("el rollback debe eliminar las tablas del dominio")
		}

		if err := migrator.Migrate(); err != nil {
			t.Fatalf("debe poder migrarse otra vez tras el rollback: %v", err)
		}
	})
}
