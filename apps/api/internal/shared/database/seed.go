package database

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"openreclamos.com/api/internal/shared/database/models"
)

//go:embed seeds/*.json
var seedFiles embed.FS

// Seed carga países y ubigeos; es idempotente y conserva los registros existentes.
func Seed(ctx context.Context, db *gorm.DB) error {
	var countries []models.Country

	if err := readSeed("seeds/countries.json", &countries); err != nil {
		return err
	}

	var districts []struct {
		Reniec     any    `json:"ubigeo_reniec"`
		INEI       any    `json:"ubigeo_inei"`
		Department string `json:"department"`
		Province   string `json:"province"`
		District   string `json:"district"`
	}

	if err := readSeed("seeds/ubigeos.json", &districts); err != nil {
		return err
	}

	ubigeos := make([]models.Ubigeo, 0, len(districts))

	for _, d := range districts {
		code := seedCode(d.INEI)
		reniec := seedCode(d.Reniec)

		ubigeos = append(ubigeos, models.Ubigeo{
			ID:           uuid.NewSHA1(uuid.NameSpaceOID, []byte("ubigeo:"+code)).String(),
			Ubigeo:       code,
			UbigeoReniec: &reniec,
			Department:   d.Department,
			Province:     d.Province,
			District:     d.District,
			Name:         strings.Join([]string{d.Department, d.Province, d.District}, " / "),
		})
	}

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "iso2"}}, DoNothing: true}).
			CreateInBatches(countries, 500).Error
		if err != nil {
			return err
		}

		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "ubigeo"}}, DoNothing: true}).
			CreateInBatches(ubigeos, 500).Error
	})
}

func readSeed(name string, out any) error {
	data, err := seedFiles.ReadFile(name)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, out)
}

func seedCode(v any) string {
	var s string

	switch n := v.(type) {
	case string:
		s = n

	case float64:
		s = fmt.Sprintf("%.0f", n)
	}

	if len(s) < 6 {
		s = strings.Repeat("0", 6-len(s)) + s
	}

	return s
}
