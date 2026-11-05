package app

import (
	"bytes"
	"context"
	"encoding/csv"
	"mime"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"strings"
	"testing"
	"time"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/phpdave11/gofpdf"
	"github.com/riverqueue/river"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/modules/complaints/feature/exports"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestBookExportDocumentsAndCSV(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, principal, header := ssoTestService(t, db)
		ctx := context.Background()
		s.Storage.Config.StorageLocalDir = t.TempDir()

		createStore := func(name string) models.Store {
			t.Helper()

			store, err := s.Repo.CreateStore(ctx, repository.CreateStoreParams{
				ID: utils.NewID(), OrganizationID: principal.OrganizationID, Slug: "store-" + utils.NewID(),
				Name: name, Type: "virtual", Color: "#2563EB",
			})
			if err != nil {
				t.Fatal(err)
			}

			return store
		}

		store := createStore("Tienda Principal")
		other := createStore("Otra tienda")
		created := time.Date(2026, 10, 10, 12, 0, 0, 0, utils.LimaZone)

		createComplaint := func(correlative, storeID string, date time.Time) models.Complaint {
			t.Helper()

			complaint := models.Complaint{
				ID: utils.NewID(), OrganizationID: principal.OrganizationID, StoreID: storeID,
				Status: "open", Priority: "low", Correlative: correlative, TrackingCode: utils.NewID(),
				FirstName: "Ana", LastName: "Pérez", DocumentType: "DNI", DocumentNumber: "12345678",
				PersonType: "natural", Email: "ana@example.com", Type: "claim", ResponseDeadlineDays: 15,
				Description:      utils.Ptr("RECEPCION-GENERADA-" + correlative),
				Request:          utils.Ptr("Texto con coma, comillas \"dobles\" y\nsalto de línea."),
				ResponseDeadline: date.AddDate(0, 0, 15), CreatedAt: date,
			}

			if err := s.Repo.CreateComplaint(ctx, &complaint); err != nil {
				t.Fatal(err)
			}

			return complaint
		}

		saveDocument := func(complaint models.Complaint, workflow string, markers ...string) {
			t.Helper()

			if err := s.Repo.UpsertDeliveries(ctx, repository.UpsertDeliveriesParams{
				ID: utils.NewID(), OrganizationID: principal.OrganizationID, ComplaintID: complaint.ID,
			}); err != nil {
				t.Fatal(err)
			}

			key := "documents/" + complaint.ID + "/" + workflow + ".pdf"

			if len(markers) > 0 {
				if err := s.Storage.Put(ctx, key, "application/pdf", bookTestPDF(t, markers)); err != nil {
					t.Fatal(err)
				}
			}

			if _, err := s.Repo.SetDocumentKey(ctx, repository.SetDocumentKeyParams{
				ComplaintID: complaint.ID, OrganizationID: principal.OrganizationID, Workflow: workflow, Key: key,
			}); err != nil {
				t.Fatal(err)
			}
		}

		createComplaint("0010", store.ID, created)
		second := createComplaint("0002", store.ID, created.Add(2*time.Hour))
		first := createComplaint("0001", store.ID, created.Add(3*time.Hour))
		third := createComplaint("0003", store.ID, created.Add(time.Hour))
		createComplaint("0000", other.ID, created)
		createComplaint("0099", store.ID, created.AddDate(0, -1, 0))

		saveDocument(first, "receipt", "NO-INCLUIR-RECEPCION-0001")
		saveDocument(first, "response", "RESPUESTA-0001-PAGINA-1", "RESPUESTA-0001-PAGINA-2")
		saveDocument(second, "receipt", "RECEPCION-0002")
		saveDocument(third, "receipt", "RECEPCION-0003")
		saveDocument(third, "response")

		export := func(format string, async bool) operation.Output {
			t.Helper()

			out, err := s.Call(ctx, "ExportBook", operation.Input{
				Data:    map[string]any{"format": format, "async": async},
				Filters: map[string]any{"store_id": store.ID, "date_start": "2026-10-01", "date_end": "2026-10-29"},
			}, header)
			if err != nil {
				t.Fatal(err)
			}

			return out
		}

		pdf := export("pdf", false)
		pages, err := pdfapi.PageCount(bytes.NewReader(pdf.Document), nil)
		if err != nil || pages != 6 {
			t.Fatalf("el libro debe tener portada y cinco páginas de constancias: %d, %v", pages, err)
		}

		if binary, err := exec.LookPath("pdftotext"); err == nil {
			command := exec.Command(binary, "-", "-")
			command.Stdin = bytes.NewReader(pdf.Document)
			text, err := command.Output()
			if err != nil {
				t.Fatal(err)
			}

			content := string(text)
			previous := -1

			for _, marker := range []string{"Tienda Principal", "2026-10-01 al 2026-10-29", "RESPUESTA-0001-PAGINA-1", "RESPUESTA-0001-PAGINA-2", "RECEPCION-0002", "RECEPCION-0003", "RECEPCION-GENERADA-0010"} {
				position := strings.Index(content, marker)
				if position < 0 || position <= previous {
					t.Fatalf("contenido ausente o fuera de orden: %s", marker)
				}

				previous = position
			}

			for _, excluded := range []string{"NO-INCLUIR-RECEPCION-0001", "RECEPCION-GENERADA-0000", "RECEPCION-GENERADA-0099"} {
				if strings.Contains(content, excluded) {
					t.Fatalf("se incluyó contenido no seleccionado: %s", excluded)
				}
			}
		}

		csvOut := export("csv", false)
		csvRows, err := csv.NewReader(bytes.NewReader(bytes.TrimPrefix(csvOut.Document, []byte("\xef\xbb\xbf")))).
			ReadAll()
		if err != nil {
			t.Fatal(err)
		}

		xlsx := export("xlsx", false)
		workbook, err := excelize.OpenReader(bytes.NewReader(xlsx.Document))
		if err != nil {
			t.Fatal(err)
		}

		defer workbook.Close()

		excelRows, err := workbook.GetRows("Sheet1")
		if err != nil || len(csvRows) != 5 || len(excelRows) != len(csvRows) {
			t.Fatalf("cantidad de filas de csv/excel: %d/%d, %v", len(csvRows), len(excelRows), err)
		}

		for i, row := range csvRows {
			for j, value := range row {
				expected := ""
				if j < len(excelRows[i]) {
					expected = excelRows[i][j]
				}

				if value != expected {
					t.Fatalf("csv distinto de excel en fila %d, columna %d: %q != %q", i, j, value, expected)
				}
			}
		}

		for index, expected := range []string{"0001", "0002", "0003", "0010"} {
			if csvRows[index+1][0] != expected {
				t.Fatal("los correlativos no están ordenados", csvRows)
			}
		}

		if err := s.StartWorkers(ctx); err != nil {
			t.Fatal(err)
		}

		queued := export("csv", true)
		id := utils.PublicData(queued.Data)["id"].(string)
		worker := exports.Worker{Feature: s.Complaints.Exports}

		if err := worker.Work(ctx, &river.Job[jobs.ExportArgs]{Args: jobs.ExportArgs{OrganizationID: principal.OrganizationID, ExportID: id}}); err != nil {
			t.Fatal(err)
		}

		request := httptest.NewRequest(http.MethodGet, "/api/exports/"+id, nil)
		request.Header = header.Clone()
		response := httptest.NewRecorder()
		s.Handler("test").ServeHTTP(response, request)

		_, params, err := mime.ParseMediaType(response.Header().Get("Content-Disposition"))
		if err != nil || response.Code != http.StatusOK || params["filename"] != csvOut.FileName ||
			!bytes.Equal(response.Body.Bytes(), csvOut.Document) {
			t.Fatalf("la descarga csv en segundo plano no coincide: status=%d, error=%v", response.Code, err)
		}

		if response.Header().Get("Content-Type") != "text/csv; charset=utf-8" {
			t.Fatal("tipo de contenido csv incorrecto")
		}
	})
}

func bookTestPDF(t *testing.T, markers []string) []byte {
	t.Helper()

	document := gofpdf.New("P", "mm", "A4", "")
	document.SetFont("Helvetica", "", 14)

	for _, marker := range markers {
		document.AddPage()
		document.Cell(180, 12, marker)
	}

	var output bytes.Buffer

	if err := document.Output(&output); err != nil {
		t.Fatal(err)
	}

	return output.Bytes()
}
