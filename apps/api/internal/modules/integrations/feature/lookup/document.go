package lookup

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	providerNone     = "none"
	documentRUC      = "ruc"
	documentDNI      = "dni"
	maxResponseBytes = 1024 * 1024
)

// providerURLs mapea los nombres admitidos de DOCUMENT_LOOKUP_PROVIDER a su API.
var providerURLs = map[string]string{
	"json_pe":      "https://api.json.pe",
	"json.pe":      "https://api.json.pe",
	"api_peru_dev": "https://apiperu.dev",
	"apiperudev":   "https://apiperu.dev",
}

// manualEntry indica al formulario que el usuario debe escribir los datos.
func manualEntry() operation.Output {
	return operation.Record(map[string]any{"available": false, "manual_entry": true})
}

// Document consulta un RUC o DNI; si el proveedor falla se pide ingreso manual.
func (f *Feature) Document(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	cfg := f.deps.Config
	if cfg.DocumentLookupProvider == providerNone {
		return manualEntry(), nil
	}

	kind, doc := utils.Text(in.Data, "type"), utils.Text(in.Data, "number")
	if (kind != documentRUC && kind != documentDNI) || (kind == documentRUC && !utils.TaxIDPattern.MatchString(doc)) ||
		(kind == documentDNI && !utils.Digits(doc, 8)) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidDocument)
	}

	base, ok := providerURLs[strings.ToLower(cfg.DocumentLookupProvider)]
	if !ok {
		return operation.Output{}, apperrors.Invalid(constants.MsgUnknownDocumentProvider)
	}

	if cfg.DocumentLookupToken == "" {
		return manualEntry(), nil
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		base+"/api/"+kind,
		bytes.NewReader(utils.JSONBytes(map[string]string{kind: doc})),
	)
	if err != nil {
		return operation.Output{}, err
	}

	req.Header.Set("Content-Type", constants.ContentTypeJSON)
	req.Header.Set("Authorization", "Bearer "+cfg.DocumentLookupToken)

	response, err := f.deps.HTTP.Safe(10 * time.Second).Do(req)
	if err != nil {
		return manualEntry(), nil
	}

	defer response.Body.Close()

	var result map[string]any
	if response.StatusCode != http.StatusOK ||
		json.NewDecoder(io.LimitReader(response.Body, maxResponseBytes)).Decode(&result) != nil {
		return manualEntry(), nil
	}

	return operation.Record(result), nil
}
