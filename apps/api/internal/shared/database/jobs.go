package database

import (
	"database/sql"

	"github.com/riverqueue/river/riverdriver"
	"github.com/riverqueue/river/riverdriver/riverdatabasesql"
	"github.com/riverqueue/river/riverdriver/riversqlite"
	"gorm.io/gorm"
)

// RiverDriver comparte el *sql.DB de GORM, así los jobs se insertan en la misma
// transacción que los cambios de dominio con cualquiera de los dos motores.
func RiverDriver(db *gorm.DB) (riverdriver.Driver[*sql.Tx], error) {
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	if IsPostgres(db) {
		return riverdatabasesql.New(sqlDB), nil
	}

	return riversqlite.New(sqlDB), nil
}
