package documents

import (
	"cmp"
	"context"
	"fmt"
	"slices"
	"strconv"

	"github.com/xuri/excelize/v2"
	"openreclamos.com/api/internal/modules/complaints/entity"
	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	bookPageSize = 100
	bookMaxPages = 100
	bookSheet    = "Sheet1"
)

// genera el libro filtrado en pdf, excel o csv.
func (f *Feature) RenderBook(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	format := utils.Text(in.Data, "format")
	if format != "" && format != constants.FormatPDF && format != constants.FormatXLSX &&
		format != constants.FormatCSV {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidFormat)
	}

	fileName, err := f.BookFileName(ctx, p, in)
	if err != nil {
		return operation.Output{}, err
	}

	rows, err := f.bookRows(ctx, p, in)
	if err != nil {
		return operation.Output{}, err
	}

	switch format {
	case constants.FormatXLSX:
		return bookXLSX(rows, fileName)
	case constants.FormatCSV:
		return bookCSV(rows, fileName)
	default:
		return f.bookPDF(ctx, p, in, rows, fileName)
	}
}

// lee los reclamos filtrados y los ordena por correlativo de menor a mayor.
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

	slices.SortFunc(all, func(a, b repository.ComplaintListItem) int {
		first, firstErr := strconv.ParseUint(a.Correlative, 10, 64)
		second, secondErr := strconv.ParseUint(b.Correlative, 10, 64)

		if firstErr == nil && secondErr == nil {
			if order := cmp.Compare(first, second); order != 0 {
				return order
			}
		} else {
			if firstErr == nil {
				return -1
			}

			if secondErr == nil {
				return 1
			}

			if order := cmp.Compare(a.Correlative, b.Correlative); order != 0 {
				return order
			}
		}

		if order := cmp.Compare(a.StoreID, b.StoreID); order != 0 {
			return order
		}

		return cmp.Compare(a.ID, b.ID)
	})

	return all, nil
}

func bookXLSX(rows []repository.ComplaintListItem, fileName string) (operation.Output, error) {
	f := excelize.NewFile()
	defer f.Close()

	headers := bookHeaders()

	if err := f.SetSheetRow(bookSheet, "A1", &headers); err != nil {
		return operation.Output{}, err
	}

	for i, c := range rows {
		cells := bookCells(c)

		if err := f.SetSheetRow(bookSheet, fmt.Sprintf("A%d", i+2), &cells); err != nil {
			return operation.Output{}, err
		}
	}

	b, err := f.WriteToBuffer()
	if err != nil {
		return operation.Output{}, err
	}

	return operation.File(b.Bytes(), fileName, constants.ContentTypeXLSX), nil
}

func bookHeaders() []string {
	headers := make([]string, 0, len(entity.BookColumns))

	for _, column := range entity.BookColumns {
		headers = append(headers, column.Label)
	}

	return headers
}

func bookCells(complaint repository.ComplaintListItem) []string {
	cells := make([]string, 0, len(entity.BookColumns))
	data := utils.PublicData(complaint)

	for _, column := range entity.BookColumns {
		cells = append(cells, entity.DisplayValue(column.Key, data[column.Key]))
	}

	return cells
}
