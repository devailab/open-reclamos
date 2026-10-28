package documents

import (
	"context"
	"fmt"
	"slices"

	"github.com/xuri/excelize/v2"
	"openreclamos.com/api/internal/modules/complaints/entity"
	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/pdf"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	bookPageSize = 100
	bookMaxPages = 100
	bookSheet    = "Sheet1"
)

// RenderBook genera el libro filtrado en PDF (por defecto) o Excel.
func (f *Feature) RenderBook(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	format := utils.Text(in.Data, "format")
	if format != "" && format != constants.FormatPDF && format != constants.FormatXLSX {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidFormat)
	}

	rows, err := f.bookRows(ctx, p, in)
	if err != nil {
		return operation.Output{}, err
	}

	if format == constants.FormatXLSX {
		return bookXLSX(rows)
	}

	org, err := f.deps.Repo.GetOrganization(ctx, p.OrganizationID)
	if err != nil {
		return operation.Output{}, err
	}

	m := pdf.New()

	pdf.Line(m, "Libro de Reclamaciones — ", org.LegalName)

	for _, c := range rows {
		pdf.Line(m, "Hoja de reclamación ", c.Correlative)

		data := utils.PublicData(c)

		for _, column := range entity.BookColumns {
			pdf.Line(m, column.Label+": ", entity.DisplayValue(column.Key, data[column.Key]))
		}
	}

	doc, err := m.Generate()
	if err != nil {
		return operation.Output{}, err
	}

	return operation.File(doc.GetBytes(), "libro.pdf", constants.ContentTypePDF), nil
}

// bookRows lee todas las páginas del filtro y las ordena por fecha de registro.
func (f *Feature) bookRows(
	ctx context.Context,
	p auth.Principal,
	in operation.Input,
) ([]repository.ComplaintListItem, error) {
	all := []repository.ComplaintListItem{}

	for page := 1; page <= bookMaxPages; page++ {
		chunk := in
		chunk.Page = page
		chunk.PageSize = bookPageSize
		batch, err := f.deps.Repo.ListComplaints(ctx, complaintutils.ListFilter(p, chunk))
		if err != nil {
			return nil, err
		}

		all = append(all, batch...)

		if len(batch) < bookPageSize {
			break
		}
	}

	slices.SortFunc(all, func(a, b repository.ComplaintListItem) int { return a.CreatedAt.Compare(b.CreatedAt) })

	return all, nil
}

func bookXLSX(rows []repository.ComplaintListItem) (operation.Output, error) {
	f := excelize.NewFile()
	defer f.Close()

	headers := []any{}

	for _, column := range entity.BookColumns {
		headers = append(headers, column.Label)
	}

	if err := f.SetSheetRow(bookSheet, "A1", &headers); err != nil {
		return operation.Output{}, err
	}

	for i, c := range rows {
		cells := []any{}
		data := utils.PublicData(c)

		for _, column := range entity.BookColumns {
			cells = append(cells, entity.DisplayValue(column.Key, data[column.Key]))
		}

		if err := f.SetSheetRow(bookSheet, fmt.Sprintf("A%d", i+2), &cells); err != nil {
			return operation.Output{}, err
		}
	}

	b, err := f.WriteToBuffer()
	if err != nil {
		return operation.Output{}, err
	}

	return operation.File(b.Bytes(), "libro.xlsx", constants.ContentTypeXLSX), nil
}
