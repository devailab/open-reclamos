package documents

import (
	"bytes"
	"encoding/csv"
	"strings"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
)

func bookCSV(rows []repository.ComplaintListItem, fileName string) (operation.Output, error) {
	var buffer bytes.Buffer

	// ayuda a excel a reconocer los acentos del archivo utf-8.
	buffer.WriteString("\uFEFF")

	writer := csv.NewWriter(&buffer)
	writer.UseCRLF = true

	if err := writer.Write(bookHeaders()); err != nil {
		return operation.Output{}, err
	}

	for _, complaint := range rows {
		cells := bookCells(complaint)

		for index, value := range cells {
			// evita que los textos del consumidor se interpreten como fórmulas.
			if strings.HasPrefix(value, "\t") || strings.HasPrefix(value, "\r") || strings.HasPrefix(value, "\n") ||
				strings.ContainsAny(firstCSVCharacter(value), "=+-@") {
				cells[index] = "'" + value
			}
		}

		if err := writer.Write(cells); err != nil {
			return operation.Output{}, err
		}
	}

	writer.Flush()

	if err := writer.Error(); err != nil {
		return operation.Output{}, err
	}

	return operation.File(buffer.Bytes(), fileName, constants.ContentTypeCSV), nil
}

func firstCSVCharacter(value string) string {
	for _, character := range strings.TrimSpace(value) {
		return string(character)
	}

	return ""
}
