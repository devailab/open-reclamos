package database_test

import (
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"

	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"openreclamos.com/api/internal/shared/database/databasetest"
	"openreclamos.com/api/internal/shared/database/models"
)

var runtimeModels = []any{
	&models.User{}, &models.EmailVerification{}, &models.Account{}, &models.Session{}, &models.APIKey{}, &models.AuditLog{},
	&models.Country{}, &models.Ubigeo{}, &models.Organization{}, &models.Role{}, &models.OrganizationMember{},
	&models.OrganizationMemberStore{}, &models.Store{}, &models.StoreCorrelative{}, &models.OrganizationInvitation{},
	&models.OrganizationInvitationStore{}, &models.OrganizationSetting{}, &models.OrganizationAuthSetting{},
	&models.ComplaintReason{}, &models.ComplaintCategory{}, &models.Complaint{}, &models.ComplaintDetail{},
	&models.ComplaintDelivery{}, &models.ComplaintAttachment{}, &models.ComplaintHistory{},
	&models.WebhookEndpoint{}, &models.WebhookDelivery{}, &models.Upload{}, &models.Export{},
	&models.SSOConnection{}, &models.OIDCConfig{}, &models.SAMLConfig{}, &models.UserSSOIdentity{},
	&models.SSOLoginAttempt{},
}

// Los modelos de runtime deben cubrir exactamente las columnas creadas por las migraciones.
func TestModelsMatchMigratedSchema(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		for _, model := range runtimeModels {
			parsed, err := schema.Parse(model, &sync.Map{}, db.NamingStrategy)
			if err != nil {
				t.Fatal(err)
			}

			columns, err := db.Migrator().ColumnTypes(model)
			if err != nil {
				t.Fatal(parsed.Table, err)
			}

			var tableColumns, modelColumns []string

			for _, column := range columns {
				tableColumns = append(tableColumns, column.Name())
			}

			for _, field := range parsed.Fields {
				modelColumns = append(modelColumns, field.DBName)

				if tag := strings.Split(field.Tag.Get("json"), ",")[0]; tag != field.DBName {
					t.Errorf("%s.%s: json %q distinto de la columna %q", parsed.Table, field.Name, tag, field.DBName)
				}
			}

			slices.Sort(tableColumns)
			slices.Sort(modelColumns)

			if !reflect.DeepEqual(tableColumns, modelColumns) {
				t.Errorf("%s: columnas %v, modelo %v", parsed.Table, tableColumns, modelColumns)
			}
		}
	})
}
