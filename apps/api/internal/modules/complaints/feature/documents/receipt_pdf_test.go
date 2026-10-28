package documents

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/utils"
)

func receiptFixture() (models.Complaint, receiptContext) {
	registered := time.Date(2026, 8, 8, 21, 30, 0, 0, utils.LimaZone)

	complaint := models.Complaint{
		ID: "019f0000-0000-7000-8000-000000000001", Correlative: "0003", TrackingCode: "8HFN-EZSYFR",
		CreatedAt: registered, ResponseDeadline: registered.AddDate(0, 0, 15), ResponseDeadlineDays: 15,
		Type: "complaint", PersonType: "natural", FirstName: "Frank", LastName: "Alvarez", DocumentType: "DNI", DocumentNumber: "76666665",
		Email: "alserfeliz@gmail.com", DialCode: utils.Ptr("+51"), Phone: utils.Ptr("993026437"), Address: utils.Ptr("Av. Prueba"),
		IncidentDate: new(
			time.Date(2026, 8, 4, 12, 0, 0, 0, utils.LimaZone),
		), Description: utils.Ptr("Test"), Request: utils.Ptr("Test"),
	}

	context := receiptContext{
		Organization: models.Organization{
			Name:        "DEVAILAB S.A.C.",
			LegalName:   "DEVAILAB S.A.C.",
			TaxID:       "20613951289",
			AddressType: "CALLE",
			Address:     "CAL. 14 NRO. 217",
		},
		Store:            models.Store{Name: "Tienda 01", Type: "virtual", Url: utils.Ptr("https://devailab.com/es")},
		ProviderLocation: "CARABAYLLO, LIMA, LIMA", ConsumerLocation: "PAUCARPATA, AREQUIPA, AREQUIPA", Reason: "Submotivo",
	}

	return complaint, context
}

func TestReceiptAndResponseShareOriginalTemplate(t *testing.T) {
	complaint, ctx := receiptFixture()
	receipt := buildReceiptDocument(complaint, ctx)
	layout := receiptLayout{Data: receipt, Meter: newReceiptMeter()}
	providerHeight := layout.panelHeight(receipt.Provider, receiptWidth*.49)
	if providerHeight < 158 || providerHeight > 159 {
		t.Fatalf("altura del proveedor incorrecta: %.2f", providerHeight)
	}

	ctx.Response = &models.ComplaintDetail{
		OfficialResponse: utils.Ptr("LA RESPUESTA ES VERDURA XD"),
		RespondedAt:      new(complaint.CreatedAt.Add(5 * time.Minute)),
	}

	response := buildReceiptDocument(complaint, ctx)
	if !reflect.DeepEqual(receipt.Provider, response.Provider) ||
		!reflect.DeepEqual(receipt.Consumer, response.Consumer) ||
		!reflect.DeepEqual(receipt.Item, response.Item) ||
		!reflect.DeepEqual(receipt.Metadata, response.Metadata) {
		t.Fatal("los datos comunes de las plantillas difieren")
	}

	if receipt.Title != "Constancia de recepción" || response.Title != "Respuesta al reclamo 0003" {
		t.Fatal("títulos diferentes al origen")
	}

	if !strings.Contains(receipt.ProviderContent, "23 de agosto de 2026") ||
		!strings.Contains(response.ProviderContent, "08/08/2026 a las 21:35") {
		t.Fatal("fecha o texto del proveedor incorrectos")
	}

	for name, data := range map[string]receiptDocument{"constancia": receipt, "respuesta": response} {
		pdf, err := renderReceiptDocument(data)
		if err != nil {
			t.Fatal(err)
		}

		pages, err := pdfapi.PageCount(bytes.NewReader(pdf), nil)
		if err != nil || pages != 1 {
			t.Fatalf("%s debe ocupar un A4 para el ejemplo: %d %v", name, pages, err)
		}

		if directory := os.Getenv("PDF_REVIEW_DIR"); directory != "" {
			if err = os.MkdirAll(directory, 0700); err != nil {
				t.Fatal(err)
			}

			if err = os.WriteFile(filepath.Join(directory, name+".pdf"), pdf, 0600); err != nil {
				t.Fatal(err)
			}
		}
	}
}

func TestReceiptFormattingCoversGuardianAndLegalPerson(t *testing.T) {
	c, ctx := receiptFixture()
	c.Type = "claim"
	c.ItemType = utils.Ptr("service")
	c.ItemDescription = utils.Ptr("Suscripción")
	c.Currency = utils.Ptr("PEN")
	c.Amount = new(models.Decimal("0.00"))
	c.HasProofOfPayment = true
	c.ProofOfPaymentType = utils.Ptr("BOLETA")
	c.ProofOfPaymentNumber = utils.Ptr("B001-123")
	c.IsMinor = true
	c.GuardianFirstName = utils.Ptr("María")
	c.GuardianLastName = utils.Ptr("Pérez")
	c.GuardianDocumentType = utils.Ptr("DNI")
	c.GuardianDocumentNumber = utils.Ptr("12345678")
	data := buildReceiptDocument(c, ctx)
	if len(data.Consumer) != 5 || data.Consumer[2].Value != "María Pérez • DNI 12345678" {
		t.Fatal("no se incluyó el tutor")
	}

	if data.Item[5].Value != "Servicio • Suscripción" || data.Item[6].Value != "Soles (S/) 0.00" ||
		data.Item[7].Value != "Boleta de venta • B001-123" {
		t.Fatal("datos de bien/monto/comprobante incorrectos", data.Item)
	}

	c.PersonType = "juridical"
	c.LegalName = utils.Ptr("Cliente SAC")
	c.LegalTaxID = utils.Ptr("20123456789")
	data = buildReceiptDocument(c, ctx)
	if data.Consumer[0].Value != "Cliente SAC" || data.Consumer[1].Value != "RUC 20123456789" ||
		!strings.Contains(data.Consumer[2].Value, "Contacto registrado: Frank Alvarez") {
		t.Fatal("representante de persona jurídica incorrecto")
	}
}

func TestReceiptLongNarrativesPreserveEveryLineAcrossPages(t *testing.T) {
	c, ctx := receiptFixture()
	c.Description = utils.Ptr(strings.Repeat("Detalle completo con acentos y caracteres. ", 120) + "FIN-DETALLE")
	c.Request = utils.Ptr(strings.Repeat("Pedido completo del consumidor. ", 130) + "FIN-PEDIDO")

	ctx.Response = &models.ComplaintDetail{
		OfficialResponse: utils.Ptr(strings.Repeat("Respuesta oficial extensa del proveedor. ", 250) + "FIN-RESPUESTA"),
		RespondedAt:      new(c.CreatedAt.Add(time.Hour)),
	}

	data := buildReceiptDocument(c, ctx)
	pdf, err := renderReceiptDocument(data)
	if err != nil {
		t.Fatal(err)
	}

	pages, err := pdfapi.PageCount(bytes.NewReader(pdf), nil)
	if err != nil || pages < 2 {
		t.Fatal("no se paginó el contenido largo", pages, err)
	}

	// Poppler verifica el contenido real del PDF cuando está disponible localmente.
	if binary, lookupErr := exec.LookPath("pdftotext"); lookupErr == nil {
		command := exec.Command(binary, "-", "-")
		command.Stdin = bytes.NewReader(pdf)
		text, extractErr := command.Output()
		if extractErr != nil {
			t.Fatal(extractErr)
		}

		for _, marker := range []string{"FIN-DETALLE", "FIN-PEDIDO", "FIN-RESPUESTA"} {
			if !bytes.Contains(text, []byte(marker)) {
				t.Fatalf("contenido truncado en el PDF: %s", marker)
			}
		}
	}

	if directory := os.Getenv("PDF_REVIEW_DIR"); directory != "" {
		if err = os.WriteFile(filepath.Join(directory, "respuesta-larga.pdf"), pdf, 0600); err != nil {
			t.Fatal(err)
		}
	}
}

func TestReceiptLongTrackingCodeFitsMetadata(t *testing.T) {
	c, ctx := receiptFixture()
	c.TrackingCode = "ABCDEF1234567890ABCDEF12"
	data := buildReceiptDocument(c, ctx)
	layout := receiptLayout{Data: data, Meter: newReceiptMeter()}

	layout.newPage()

	var tracking strings.Builder

	for _, text := range layout.Current.Texts {
		if text.X == receiptWidth/2+6 && text.Size == 8 {
			tracking.WriteString(text.Value)

			if layout.Meter.width(text.Value, text.Size, text.Bold, text.Family) > text.Width {
				t.Fatal("el código excede su columna")
			}

			if text.Y+10.4 > layout.Y-8 {
				t.Fatal("el código excede la franja de metadatos")
			}
		}
	}

	if tracking.String() != c.TrackingCode {
		t.Fatal("código de seguimiento truncado", tracking.String())
	}

	if _, err := renderReceiptDocument(data); err != nil {
		t.Fatal(err)
	}
}
