package database_test

import (
	"regexp"
	"strings"
	"testing"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database"
	"openreclamos.com/api/internal/shared/database/databasetest"
)

func TestDomainTablesHaveNoCheckConstraints(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		if database.IsPostgres(db) {
			var constraints []string

			err := db.Raw(`SELECT t.relname || '.' || c.conname
				FROM pg_constraint c
				JOIN pg_class t ON t.oid = c.conrelid
				JOIN pg_namespace n ON n.oid = t.relnamespace
				WHERE n.nspname = current_schema() AND c.contype = 'c'
				AND t.relname NOT LIKE 'river_%'`).Scan(&constraints).Error
			if err != nil {
				t.Fatal(err)
			}

			if len(constraints) != 0 {
				t.Fatalf("quedan restricciones check en las tablas del dominio: %v", constraints)
			}

			return
		}

		var tables []struct {
			Name string
			SQL  string
		}

		if err := db.Raw("SELECT name, sql FROM sqlite_master WHERE type = 'table'").Scan(&tables).Error; err != nil {
			t.Fatal(err)
		}

		checkPattern := regexp.MustCompile(`(?i)\bCHECK\s*\(`)

		for _, table := range tables {
			if strings.HasPrefix(table.Name, "river_") || strings.HasPrefix(table.Name, "sqlite_") {
				continue
			}

			if checkPattern.MatchString(table.SQL) {
				t.Fatalf("queda una restricción check en la tabla %s", table.Name)
			}
		}
	})
}
