package repository

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

var ErrNotFound = gorm.ErrRecordNotFound

func IsNotFound(err error) bool { return errors.Is(err, gorm.ErrRecordNotFound) }

func IsDuplicate(err error) bool { return errors.Is(err, gorm.ErrDuplicatedKey) }

// IsInvalidData agrupa referencias rotas, CHECK fallidos y valores con formato inválido
// (22P02: PostgreSQL valida los UUID; SQLite los guarda como texto).
func IsInvalidData(err error) bool {
	if errors.Is(err, gorm.ErrForeignKeyViolated) || errors.Is(err, gorm.ErrCheckConstraintViolated) {
		return true
	}

	var pgErr *pgconn.PgError

	return errors.As(err, &pgErr) && pgErr.Code == "22P02"
}
