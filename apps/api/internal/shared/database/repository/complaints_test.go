package repository_test

import (
	"context"
	"reflect"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/database/databasetest"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
)

var lima = time.FixedZone("America/Lima", -5*60*60)

// Cubre las consultas cuyo SQL difiere entre motores: orden por vencimiento, filtros de
// fechas y texto, métricas agregadas y agrupación diaria.
func TestComplaintQueriesBehaveTheSameOnEveryDatabase(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		repo := repository.New(db)
		organizationID, storeID := complaintFixtures(t, db, repo)
		now := time.Now()
		ids := map[string]string{}

		for _, c := range []struct {
			name, status, priority, lastName string
			deadline, created                time.Duration
		}{
			{"soon", "open", "low", "Perez", 24 * time.Hour, -48 * time.Hour},
			{"later", "open", "urgent", "Gomez", 5 * 24 * time.Hour, -24 * time.Hour},
			{"resolved", "resolved", "high", "Quispe", -3 * 24 * time.Hour, -10 * 24 * time.Hour},
			{"overdue", "in_review", "medium", "Rojas", -24 * time.Hour, 0},
		} {
			id := uuid.Must(uuid.NewV7()).String()
			ids[c.name] = id

			// Fechas en hora local de Lima: el repositorio debe normalizarlas a UTC.
			err := repo.CreateComplaint(ctx, &models.Complaint{
				ID: id, OrganizationID: organizationID, StoreID: storeID,
				Status: c.status, Priority: c.priority, TrackingCode: c.name, Correlative: c.name,
				FirstName: "Ana", LastName: c.lastName, DocumentType: "DNI", DocumentNumber: "12345678",
				PersonType: "natural", Email: "ana@example.com", Type: "claim", ResponseDeadlineDays: 15,
				ResponseDeadline: now.Add(c.deadline).In(lima), CreatedAt: now.Add(c.created).UTC(),
			})
			if err != nil {
				t.Fatal(err)
			}
		}

		base := repository.ComplaintFilter{OrganizationID: organizationID, AllStores: true, PageSize: 20}

		order := func(f repository.ComplaintFilter) []string {
			t.Helper()

			rows, err := repo.ListComplaints(ctx, f)
			if err != nil {
				t.Fatal(err)
			}

			names := []string{}

			for _, row := range rows {
				names = append(names, row.TrackingCode)

				if row.StoreName != "Tienda" || row.Total != int64(len(rows)) {
					t.Fatalf("columnas calculadas incorrectas: %+v", row)
				}
			}

			return names
		}

		check := func(name string, got, want []string) {
			t.Helper()

			if !reflect.DeepEqual(got, want) {
				t.Fatalf("%s: %v, esperado %v", name, got, want)
			}
		}

		check("recientes", order(base), []string{"overdue", "later", "soon", "resolved"})

		featured := base
		featured.SortOrder = "featured"

		check("destacados", order(featured), []string{"overdue", "soon", "later", "resolved"})

		byPriority := base
		byPriority.SortOrder = "priority"

		check("prioridad", order(byPriority), []string{"later", "resolved", "overdue", "soon"})

		overdue := base
		overdue.Overdue = true

		check("vencidos", order(overdue), []string{"overdue"})

		search := base
		search.Search = "PEREZ"

		check("búsqueda", order(search), []string{"soon"})

		dated := base
		start, end := now.Add(-72*time.Hour).In(lima), now.Add(-12*time.Hour).In(lima)
		dated.DateStart, dated.DateEnd = &start, &end

		check("fechas", order(dated), []string{"later", "soon"})

		if count, err := repo.CountComplaints(ctx, dated); err != nil || count != 2 {
			t.Fatalf("conteo con fechas: %d %v", count, err)
		}

		scoped := base
		scoped.AllStores, scoped.StoreIds = false, nil

		check("sin tiendas asignadas", order(scoped), []string{})

		dashboard, err := repo.GetDashboard(
			ctx,
			repository.GetDashboardParams{OrganizationID: organizationID, AllStores: true},
		)

		want := repository.Dashboard{Total: 4, Open: 2, InReview: 1, Resolved: 1, Overdue: 1}
		if err != nil || dashboard != want {
			t.Fatalf("dashboard %+v, esperado %+v (%v)", dashboard, want, err)
		}

		trend, err := repo.DailyTrend(ctx, repository.DailyTrendParams{
			OrganizationID: organizationID, AllStores: true, Days: 15, Location: lima,
		})

		var total int64

		for _, point := range trend {
			total += point.Total
		}

		if err != nil || total != 4 || len(trend) < 3 {
			t.Fatalf("tendencia %+v (%v)", trend, err)
		}

		if _, err = repo.LockComplaint(ctx, repository.GetComplaintParams{
			ID: ids["soon"], OrganizationID: organizationID, StoreIds: []string{uuid.NewString()},
		}); !repository.IsNotFound(err) {
			t.Fatal("el alcance por tienda debe ocultar el reclamo", err)
		}
	})
}

func complaintFixtures(t *testing.T, db *gorm.DB, repo *repository.Repository) (string, string) {
	t.Helper()

	ctx := context.Background()
	ubigeoID, organizationID := uuid.NewString(), uuid.NewString()

	err := repo.Transaction(ctx, func(tx *repository.Repository) error {
		if tx.SQLTx() == nil {
			t.Error("la transacción debe exponer *sql.Tx para encolar jobs de River")
		}

		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := db.Create(&models.Ubigeo{ID: ubigeoID, Ubigeo: "150101", Department: "LIMA", Province: "LIMA", District: "LIMA", Name: "LIMA / LIMA / LIMA"}).Error; err != nil {
		t.Fatal(err)
	}

	if _, err := repo.CreateOrganization(ctx, repository.CreateOrganizationParams{
		ID: organizationID, UbigeoID: ubigeoID, Slug: "empresa", Name: "Empresa", LegalName: "Empresa SAC",
		TaxID: "20123456789", AddressType: "Av.", Address: "Principal 123",
	}); err != nil {
		t.Fatal(err)
	}

	store, err := repo.CreateStore(ctx, repository.CreateStoreParams{
		ID: uuid.NewString(), OrganizationID: organizationID, Slug: "tienda", Name: "Tienda", Type: "virtual", Color: "#2563EB",
	})
	if err != nil {
		t.Fatal(err)
	}

	return organizationID, store.ID
}

// El primer PDF registrado gana: un segundo proceso no reemplaza la clave guardada.
func TestSetDocumentKeyKeepsTheFirstDocument(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		repo := repository.New(db)
		organizationID, storeID := complaintFixtures(t, db, repo)
		id := uuid.Must(uuid.NewV7()).String()

		err := repo.CreateComplaint(ctx, &models.Complaint{
			ID: id, OrganizationID: organizationID, StoreID: storeID,
			Status: "open", Priority: "low", TrackingCode: "DOC", Correlative: "DOC",
			FirstName: "Ana", LastName: "Perez", DocumentType: "DNI", DocumentNumber: "12345678",
			PersonType: "natural", Email: "ana@example.com", Type: "claim", ResponseDeadlineDays: 15,
			ResponseDeadline: time.Now().Add(24 * time.Hour), CreatedAt: time.Now(),
		})
		if err != nil {
			t.Fatal(err)
		}

		if err = repo.UpsertDeliveries(ctx, repository.UpsertDeliveriesParams{ID: uuid.NewString(), OrganizationID: organizationID, ComplaintID: id}); err != nil {
			t.Fatal(err)
		}

		set := func(workflow, key string) bool {
			t.Helper()

			saved, err := repo.SetDocumentKey(
				ctx,
				repository.SetDocumentKeyParams{
					ComplaintID:    id,
					OrganizationID: organizationID,
					Workflow:       workflow,
					Key:            key,
				},
			)
			if err != nil {
				t.Fatal(err)
			}

			return saved
		}
		if !set("receipt", "documents/first.pdf") || set("receipt", "documents/second.pdf") {
			t.Fatal("solo el primer documento de constancia debe registrarse")
		}

		if !set("response", "documents/response.pdf") {
			t.Fatal("la respuesta usa su propia columna")
		}

		if saved, err := repo.SetDocumentKey(ctx, repository.SetDocumentKeyParams{ComplaintID: id, OrganizationID: uuid.NewString(), Workflow: "receipt", Key: "documents/other.pdf"}); err != nil ||
			saved {
			t.Fatal("otra empresa no puede registrar documentos del reclamo", err)
		}

		delivery, err := repo.GetDeliveries(
			ctx,
			repository.GetDeliveriesParams{OrganizationID: organizationID, ComplaintID: id},
		)
		if err != nil {
			t.Fatal(err)
		}

		if *delivery.ReceiptDocumentKey != "documents/first.pdf" ||
			*delivery.ResponseDocumentKey != "documents/response.pdf" {
			t.Fatalf("claves inesperadas: %v %v", *delivery.ReceiptDocumentKey, *delivery.ResponseDocumentKey)
		}
	})
}
