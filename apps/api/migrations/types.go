package migrations

import (
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// Tipos exclusivos del DDL: cada motor recibe su tipo nativo sin duplicar migraciones.
// Se mantienen aquí (y no en models) para que una migración publicada nunca cambie.

type uuidColumn string

func (uuidColumn) GormDBDataType(db *gorm.DB, _ *schema.Field) string {
	if db.Dialector.Name() == "postgres" {
		return "uuid"
	}

	return "text"
}

type jsonColumn []byte

func (jsonColumn) GormDBDataType(db *gorm.DB, _ *schema.Field) string {
	if db.Dialector.Name() == "postgres" {
		return "jsonb"
	}

	return "text"
}
