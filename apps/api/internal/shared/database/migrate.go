package database

import (
	"context"
	"errors"
	"slices"

	"github.com/riverqueue/river/rivermigrate"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/migrations"
)

var ErrMigrationsRequired = errors.New(constants.DBMigrationsRequired)

// Migrate aplica las migraciones del dominio y las oficiales de River.
func Migrate(ctx context.Context, db *gorm.DB) error {
	return withMigrationLock(ctx, db, func() error {
		if err := migrations.New(db.WithContext(ctx)).Migrate(); err != nil {
			return err
		}

		driver, err := RiverDriver(db)
		if err != nil {
			return err
		}

		migrator, err := rivermigrate.New(driver, nil)
		if err != nil {
			return err
		}

		_, err = migrator.Migrate(ctx, rivermigrate.DirectionUp, nil)

		return err
	})
}

// En PostgreSQL el mismo lock cubre dominio y River, incluso en despliegues concurrentes.
// SQLite ya serializa a los migradores con transacciones IMMEDIATE sobre el archivo local.
func withMigrationLock(ctx context.Context, db *gorm.DB, fn func() error) error {
	if !IsPostgres(db) {
		return fn()
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	conn, err := sqlDB.Conn(ctx)
	if err != nil {
		return err
	}

	defer conn.Close()

	if _, err = conn.ExecContext(ctx, "SELECT pg_advisory_lock(71964230)"); err != nil {
		return err
	}

	defer conn.ExecContext(context.WithoutCancel(ctx), "SELECT pg_advisory_unlock(71964230)")

	return fn()
}

// Ready confirma que el esquema esperado por este binario ya está aplicado.
func Ready(ctx context.Context, db *gorm.DB) error {
	var applied []string

	if err := db.WithContext(ctx).Table(migrations.TableName()).Pluck("id", &applied).Error; err != nil {
		return ErrMigrationsRequired
	}

	for _, id := range migrations.IDs() {
		if !slices.Contains(applied, id) {
			return ErrMigrationsRequired
		}
	}

	if !db.WithContext(ctx).Migrator().HasTable("river_job") {
		return ErrMigrationsRequired
	}

	return nil
}
