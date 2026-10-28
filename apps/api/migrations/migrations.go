// Package migrations contiene las migraciones versionadas del dominio, escritas una sola
// vez en Go con GORM y ejecutadas igual en PostgreSQL y SQLite.
package migrations

import (
	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
)

// Agregar al final; nunca reordenar ni editar una migración publicada.
var all = []*gormigrate.Migration{
	initialSchema,
}

var options = &gormigrate.Options{
	TableName:                 "schema_migrations",
	IDColumnName:              "id",
	IDColumnSize:              255,
	UseTransaction:            true,
	ValidateUnknownMigrations: true,
}

func New(db *gorm.DB) *gormigrate.Gormigrate { return gormigrate.New(db, options, all) }

// IDs aplicados que el binario espera encontrar antes de servir peticiones.
func IDs() []string {
	ids := make([]string, len(all))

	for i, migration := range all {
		ids[i] = migration.ID
	}

	return ids
}

func TableName() string { return options.TableName }
