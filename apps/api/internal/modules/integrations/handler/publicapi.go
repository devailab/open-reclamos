// Package handler expone la API REST pública (Huma) y el servidor MCP sobre las operaciones RPC.
package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humago"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

type APIQuery struct {
	Authorization string `header:"Authorization" required:"true"`
	Page          int    `                                       query:"page"     default:"1"  minimum:"1"`
	PageSize      int    `                                       query:"pageSize" default:"20" minimum:"1" maximum:"100"`
	Search        string `                                       query:"search"`
	Status        string `                                       query:"status"`
	StoreID       string `                                       query:"storeId"`
}

type APIEntityQuery struct {
	Authorization string `header:"Authorization" required:"true"`
	ID            string `                                       path:"id"`
}

type APIResponse struct {
	Body struct {
		Data        any    `json:"data"`
		Document    []byte `json:"document,omitempty"`
		FileName    string `json:"fileName,omitempty"`
		ContentType string `json:"contentType,omitempty"`
	}
}

type APIMutation struct {
	Authorization string `header:"Authorization" required:"true"`
	ID            string `                                       path:"id"`
	Body          map[string]any
}

// Rutas REST de listado y de entidad, mapeadas a su operación RPC.
var (
	listRoutes = map[string]string{
		"/api/v1/complaints": constants.OpListComplaints,
		"/api/v1/stores":     constants.OpListStores,
		"/api/v1/reasons":    constants.OpListReasons,
		"/api/v1/stats":      constants.OpGetDashboard,
	}

	entityRoutes = map[string]string{
		"/api/v1/complaints/{id}":                   constants.OpGetComplaint,
		"/api/v1/stores/{id}":                       constants.OpGetStore,
		"/api/v1/complaints/{id}/receipt":           constants.OpGetReceipt,
		"/api/v1/complaints/{id}/response-document": constants.OpGetResponsePDF,
	}

	apiSecurity = []map[string][]string{{"apiKey": {}}}
)

// RegisterPublicAPI publica /api/v1 con OpenAPI en /api/openapi y docs (Scalar) en /api/docs.
func RegisterPublicAPI(mux *http.ServeMux, registry *operation.Registry) {
	cfg := huma.DefaultConfig(constants.APITitle, "1.0.0")
	cfg.OpenAPIPath, cfg.DocsPath, cfg.SchemasPath = "/api/openapi", "/api/docs", "/api/schemas"
	cfg.DocsRenderer = huma.DocsRendererScalar
	cfg.Components.SecuritySchemes = map[string]*huma.SecurityScheme{"apiKey": {Type: "http", Scheme: "bearer"}}
	api := humago.New(mux, cfg)

	for path, method := range listRoutes {
		huma.Register(
			api,
			huma.Operation{OperationID: method, Method: http.MethodGet, Path: path, Security: apiSecurity},
			func(ctx context.Context, input *APIQuery) (*APIResponse, error) {
				in := operation.Input{
					Page:     input.Page,
					PageSize: input.PageSize,
					Filters:  map[string]any{"search": input.Search, "status": input.Status, "store_id": input.StoreID},
				}

				return call(ctx, registry, method, in, input.Authorization)
			},
		)
	}

	for path, method := range entityRoutes {
		huma.Register(
			api,
			huma.Operation{OperationID: method, Method: http.MethodGet, Path: path, Security: apiSecurity},
			func(ctx context.Context, input *APIEntityQuery) (*APIResponse, error) {
				return call(ctx, registry, method, operation.Input{ID: input.ID}, input.Authorization)
			},
		)
	}

	huma.Register(
		api,
		huma.Operation{
			OperationID: constants.OpRespond,
			Method:      http.MethodPost,
			Path:        "/api/v1/complaints/{id}/response",
			Security:    apiSecurity,
		},
		func(ctx context.Context, input *APIMutation) (*APIResponse, error) {
			in := operation.Input{ID: input.ID, Data: input.Body}

			return call(ctx, registry, constants.OpRespond, in, input.Authorization)
		},
	)
}

func call(
	ctx context.Context,
	registry *operation.Registry,
	method string,
	in operation.Input,
	authorization string,
) (*APIResponse, error) {
	if !strings.HasPrefix(authorization, "Bearer ") {
		return nil, huma.Error401Unauthorized(constants.APIBearerRequired)
	}

	out, err := registry.Call(ctx, method, in, http.Header{"Authorization": []string{authorization}})
	if err != nil {
		return nil, apiError(err)
	}

	response := &APIResponse{}
	response.Body.Data, response.Body.Document = utils.PublicData(out.Data), out.Document
	response.Body.FileName, response.Body.ContentType = out.FileName, out.ContentType

	return response, nil
}

func apiError(err error) error {
	switch apperrors.Code(err) {
	case apperrors.CodeUnauthenticated:
		return huma.Error401Unauthorized(constants.APIInvalidKey)

	case apperrors.CodePermissionDenied:
		return huma.Error403Forbidden(constants.APIForbidden)

	case apperrors.CodeNotFound:
		return huma.Error404NotFound(constants.MsgNotFound)

	case apperrors.CodeInvalidArgument:
		return huma.Error400BadRequest(constants.APIInvalidData)

	case apperrors.CodeAlreadyExists, apperrors.CodeFailedCondition:
		return huma.Error409Conflict(constants.APIConflict)

	default:
		return huma.Error500InternalServerError(constants.MsgOperationFailed)
	}
}
