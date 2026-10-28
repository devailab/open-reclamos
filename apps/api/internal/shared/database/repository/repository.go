// Package repository concentra el acceso a datos con GORM. Cada método expresa una
// consulta del dominio y funciona igual en PostgreSQL y SQLite; las pocas diferencias
// entre motores viven en dialect.go.
package repository

import (
	"context"
	"database/sql"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct{ db *gorm.DB }

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

// Transaction ejecuta fn con un repositorio ligado a una única transacción.
func (r *Repository) Transaction(ctx context.Context, fn func(tx *Repository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { return fn(&Repository{db: tx}) })
}

// SQLTx expone la transacción SQL en curso para encolar jobs de River dentro de ella.
func (r *Repository) SQLTx() *sql.Tx {
	tx, _ := r.db.Statement.ConnPool.(*sql.Tx)

	return tx
}

func (r *Repository) conn(ctx context.Context) *gorm.DB { return r.db.WithContext(ctx) }

// Bloqueos de fila: PostgreSQL los aplica; el dialecto SQLite omite la cláusula y las
// transacciones IMMEDIATE ya serializan a los escritores.
func forUpdate(q *gorm.DB) *gorm.DB {
	return q.Clauses(clause.Locking{Strength: clause.LockingStrengthUpdate})
}

func forShare(q *gorm.DB) *gorm.DB {
	return q.Clauses(clause.Locking{Strength: clause.LockingStrengthShare})
}

// Todas las fechas se guardan en UTC para que SQLite compare correctamente su texto.
func now() time.Time { return time.Now().UTC() }

// Solo restringe por tienda cuando el principal no tiene acceso a todas.
func storeScope(q *gorm.DB, column string, allStores bool, storeIDs []string) *gorm.DB {
	if allStores {
		return q
	}

	return q.Where(column+" IN ?", nonNil(storeIDs))
}

func nonNil(ids []string) []string {
	if ids == nil {
		return []string{}
	}

	return ids
}

// Convierte "" en NULL, como hacían las consultas con NULLIF.
func nullable(v string) *string {
	if v == "" {
		return nil
	}

	return &v
}

func rows(result *gorm.DB) (int64, error) { return result.RowsAffected, result.Error }

// Devuelve ErrNotFound si la actualización no afectó filas, igual que UPDATE ... RETURNING.
func updated(result *gorm.DB) error {
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}
