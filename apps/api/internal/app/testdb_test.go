package app

import (
	"testing"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database/databasetest"
)

// forEachDatabase ejecuta la prueba con una base migrada y sembrada en cada motor disponible.
func forEachDatabase(t *testing.T, fn func(t *testing.T, db *gorm.DB)) {
	databasetest.Run(t, databasetest.Options{}, fn)
}
