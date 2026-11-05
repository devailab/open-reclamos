package documents

import (
	"bytes"
	"fmt"
	"time"

	"github.com/phpdave11/gofpdf"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/utils"
)

func renderBookCover(
	organization models.Organization,
	storeName string,
	filters map[string]any,
	count int,
) ([]byte, error) {
	document := gofpdf.New("P", "mm", "A4", "")
	document.SetMargins(20, 20, 20)
	document.SetAutoPageBreak(false, 20)

	text := document.UnicodeTranslatorFromDescriptor("")
	document.SetTitle("Libro de Reclamaciones", true)
	document.SetAuthor(organization.Name, true)
	document.AddPage()

	document.SetTextColor(int(receiptInk.R), int(receiptInk.G), int(receiptInk.B))
	document.SetFont("Helvetica", "B", 29)
	document.SetXY(20, 34)
	document.MultiCell(170, 12, "Libro de\nReclamaciones", "", "L", false)

	document.SetXY(20, 98)
	document.SetTextColor(int(receiptMuted.R), int(receiptMuted.G), int(receiptMuted.B))
	document.SetFont("Helvetica", "B", 9)
	document.MultiCell(170, 6, "EMPRESA", "", "L", false)
	document.SetTextColor(int(receiptInk.R), int(receiptInk.G), int(receiptInk.B))
	document.SetFont("Helvetica", "B", 20)
	document.MultiCell(170, 9, text(organization.Name), "", "L", false)

	if organization.LegalName != organization.Name {
		document.SetFont("Helvetica", "", 11)
		document.MultiCell(170, 6, text(organization.LegalName), "", "L", false)
	}

	document.SetFont("Helvetica", "", 11)
	document.SetTextColor(int(receiptSlate.R), int(receiptSlate.G), int(receiptSlate.B))
	document.MultiCell(170, 8, "RUC: "+organization.TaxID, "", "L", false)
	document.Ln(10)

	bookCoverPanel(document, "TIENDA O SUCURSAL", storeName)

	period := "Todos los registros"
	if utils.Text(filters, "date_start") != "" || utils.Text(filters, "date_end") != "" {
		period = bookDates(filters, time.Now())
	}

	bookCoverPanel(document, "PERÍODO DEL REPORTE", period)

	if count == 0 {
		document.Ln(5)
		document.MultiCell(170, 6, text("No se encontraron reclamos para los filtros seleccionados."), "", "L", false)
	}

	document.SetXY(20, 282)
	document.SetTextColor(int(receiptMuted.R), int(receiptMuted.G), int(receiptMuted.B))
	document.SetFont("Helvetica", "B", 9)
	document.CellFormat(85, 5, "Open Reclamos", "", 0, "L", false, 0, "")
	document.CellFormat(85, 5, fmt.Sprintf("Total de reclamos: %d", count), "", 0, "R", false, 0, "")

	var buffer bytes.Buffer

	if err := document.Output(&buffer); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func bookCoverPanel(document *gofpdf.Fpdf, label, value string) {
	text := document.UnicodeTranslatorFromDescriptor("")
	document.SetFont("Helvetica", "", 12)
	lines := max(1, len(document.SplitLines([]byte(text(value)), 162)))
	height := float64(lines)*7 + 17
	y := document.GetY()
	const headerHeight = 8.0

	document.SetFillColor(int(receiptGray.R), int(receiptGray.G), int(receiptGray.B))
	document.Rect(20+receiptMM, y+receiptMM, 170-2*receiptMM, headerHeight-receiptMM, "F")
	document.SetDrawColor(int(receiptBorder.R), int(receiptBorder.G), int(receiptBorder.B))
	document.SetLineWidth(receiptMM)
	document.RoundedRect(20, y, 170, height, 2*receiptMM, "1234", "D")
	document.Line(20, y+headerHeight, 190, y+headerHeight)
	document.SetXY(24, y+1.5)
	document.SetTextColor(int(receiptSlate.R), int(receiptSlate.G), int(receiptSlate.B))
	document.SetFont("Helvetica", "B", 8)
	document.MultiCell(162, 5, text(label), "", "L", false)
	document.SetXY(24, y+12)
	document.SetTextColor(int(receiptInk.R), int(receiptInk.G), int(receiptInk.B))
	document.SetFont("Helvetica", "", 12)
	document.MultiCell(162, 7, text(value), "", "L", false)
	document.SetXY(20, y+height+7)
}
