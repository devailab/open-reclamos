package database

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/libtnb/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
)

const (
	DriverPostgres = "postgres"
	DriverSQLite   = "sqlite"
)

// Open conecta con el motor configurado. Ambos comparten el mismo código GORM.
func Open(ctx context.Context, cfg config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.DatabaseDriver {
	case DriverPostgres:
		connConfig, err := pgx.ParseConfig(cfg.DatabaseURL)
		if err != nil {
			return nil, errors.New(constants.DBInvalidPostgresConfig)
		}

		connConfig.ConnectTimeout = 5 * time.Second
		connConfig.RuntimeParams["application_name"] = "open-reclamos"
		dialector = postgres.New(postgres.Config{Conn: stdlib.OpenDB(*connConfig)})

	case DriverSQLite:
		if err := os.MkdirAll(filepath.Dir(cfg.SQLitePath), 0700); err != nil {
			return nil, errors.New(constants.DBSQLiteDirectoryFailed)
		}

		dialector = sqlite.Open(sqliteDSN(cfg.SQLitePath))

	default:
		return nil, fmt.Errorf(constants.DBUnknownDriver, cfg.DatabaseDriver)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:         logger.Discard,
		NowFunc:        func() time.Time { return time.Now().UTC() },
		TranslateError: true,
	})
	if err != nil {
		return nil, errors.New(constants.DBOpenFailed)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	if cfg.DatabaseDriver == DriverSQLite {
		// Las transacciones IMMEDIATE serializan escrituras; busy_timeout espera en vez de fallar.
		sqlDB.SetMaxOpenConns(4)
	} else {
		sqlDB.SetMaxOpenConns(10)
	}

	sqlDB.SetMaxIdleConns(4)

	if err = sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()

		return nil, errors.New(constants.DBUnavailable)
	}

	return db, nil
}

// Fechas en UTC con formato ordenable: las comparaciones de texto equivalen a las temporales.
func sqliteDSN(path string) string {
	return "file:" + path +
		"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(10000)" +
		"&_pragma=synchronous(NORMAL)&_txlock=immediate&_time_format=sqlite"
}

func Close(db *gorm.DB) error {
	if db == nil {
		return nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	return sqlDB.Close()
}

func IsPostgres(db *gorm.DB) bool { return db.Dialector.Name() == DriverPostgres }
