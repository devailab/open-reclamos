package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"openreclamos.com/api/internal/modules/complaints/feature/complaints"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/deps"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

type ToolInput struct {
	Page         int    `json:"page,omitempty"`
	PageSize     int    `json:"pageSize,omitempty"`
	Search       string `json:"search,omitempty"`
	Status       string `json:"status,omitempty"`
	StoreID      string `json:"storeId,omitempty"`
	Type         string `json:"type,omitempty"         jsonschema:"Tipo: claim (reclamo) o complaint (queja)"`
	Priority     string `json:"priority,omitempty"     jsonschema:"Prioridad: low, medium, high o urgent"`
	CategoryID   string `json:"categoryId,omitempty"   jsonschema:"Identificador UUID de la categoría"`
	DateStart    string `json:"dateStart,omitempty"    jsonschema:"Fecha inicial de registro inclusiva en formato YYYY-MM-DD o RFC3339"`
	DateEnd      string `json:"dateEnd,omitempty"      jsonschema:"Fecha final de registro inclusiva para YYYY-MM-DD o exclusiva para RFC3339"`
	TrackingCode string `json:"trackingCode,omitempty"`
}

// mcpTools mapea cada herramienta MCP a su operación RPC de solo lectura.
var mcpTools = map[string]string{
	constants.ToolListComplaints:       constants.OpListComplaints,
	constants.ToolGetComplaint:         constants.OpGetComplaint,
	constants.ToolListStores:           constants.OpListStores,
	constants.ToolListReasons:          constants.OpListReasons,
	constants.ToolGetOrganizationStats: constants.OpGetDashboard,
}

// sensitiveFields se enmascaran salvo que la empresa permita datos sensibles en MCP.
var (
	maskedFields = []string{
		"first_name",
		"last_name",
		"phone",
		"address",
		"guardian_first_name",
		"guardian_last_name",
		"guardian_document_number",
		"document_number",
		"legal_tax_id",
		"legal_name",
		"email",
	}

	removedFields = []string{"draft_response", "internal_note"}
)

type MCP struct {
	deps       *deps.Deps
	registry   *operation.Registry
	complaints *complaints.Feature
}

func NewMCP(d *deps.Deps, registry *operation.Registry, complaints *complaints.Feature) *MCP {
	return &MCP{deps: d, registry: registry, complaints: complaints}
}

// ServeHTTP atiende MCP sin estado autenticado con clave API; las herramientas dependen de la empresa.
func (h *MCP) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.deps.DB == nil {
		http.Error(w, constants.HTTPDBNotConfigured, http.StatusServiceUnavailable)

		return
	}

	if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
		http.Error(w, constants.HTTPAPIKeyRequired, http.StatusUnauthorized)

		return
	}

	p, err := h.deps.Auth.Authenticate(r.Context(), r.Header)
	if err == nil {
		p, err = h.deps.Auth.Tenant(r.Context(), p, p.OrganizationID)
	}

	if err != nil {
		http.Error(w, constants.HTTPUnauthorized, http.StatusForbidden)

		return
	}

	settings, err := h.deps.Repo.GetSettings(r.Context(), p.OrganizationID)
	if err != nil {
		http.Error(w, constants.HTTPSettingsUnavailable, http.StatusInternalServerError)

		return
	}

	var enabled []string

	if len(settings.McpEnabledTools) > 0 {
		if json.Unmarshal(settings.McpEnabledTools, &enabled) != nil {
			http.Error(w, constants.HTTPInvalidSettings, http.StatusInternalServerError)

			return
		}
	}

	server := mcp.NewServer(&mcp.Implementation{Name: "open-reclamos", Version: "1.0.0"}, nil)

	for name, method := range mcpTools {
		if enabled != nil && !slices.Contains(enabled, name) {
			continue
		}

		mcp.AddTool(
			server,
			&mcp.Tool{
				Name:        name,
				Description: constants.MCPToolDescription,
				Annotations: &mcp.ToolAnnotations{ReadOnlyHint: true},
			},
			h.tool(r.Header.Clone(), method, settings),
		)
	}

	handler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{Stateless: true},
	)

	handler.ServeHTTP(w, r)
}

func (h *MCP) tool(
	header http.Header,
	method string,
	settings models.OrganizationSetting,
) mcp.ToolHandlerFor[ToolInput, map[string]any] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, input ToolInput) (*mcp.CallToolResult, map[string]any, error) {
		var out operation.Output
		var err error

		if method == constants.OpGetComplaint {
			if input.TrackingCode == "" {
				return nil, nil, apperrors.Invalid(constants.MsgTrackingCodeRequired)
			}

			out, err = h.complaints.LookupByTracking(ctx, header, input.TrackingCode)
		} else {
			in := operation.Input{
				Page:     input.Page,
				PageSize: input.PageSize,
				Filters: map[string]any{
					"search":      input.Search,
					"status":      input.Status,
					"store_id":    input.StoreID,
					"type":        input.Type,
					"priority":    input.Priority,
					"category_id": input.CategoryID,
					"date_start":  input.DateStart,
					"date_end":    input.DateEnd,
				},
			}

			out, err = h.registry.Call(ctx, method, in, header)
		}

		if err != nil {
			return nil, nil, err
		}

		data := utils.PublicData(out.Data)

		if method == constants.OpGetComplaint {
			data = flattenComplaint(data)
		}

		if !settings.McpShowSensitiveData &&
			(method == constants.OpListComplaints || method == constants.OpGetComplaint) {
			mask(data)
		}

		return nil, data, nil
	}
}

// flattenComplaint devuelve el reclamo con su respuesta oficial al primer nivel.
func flattenComplaint(data map[string]any) map[string]any {
	complaint, _ := data["complaint"].(map[string]any)
	details, _ := data["details"].(map[string]any)
	complaint["official_response"] = details["official_response"]
	complaint["responded_at"] = details["responded_at"]

	return complaint
}

func mask(v any) {
	switch data := v.(type) {
	case map[string]any:
		for key, value := range data {
			switch {
			case slices.Contains(maskedFields, key):
				if value != nil {
					data[key] = "***"
				}

			case slices.Contains(removedFields, key):
				data[key] = nil

			default:
				mask(value)
			}
		}

	case []any:
		for _, record := range data {
			mask(record)
		}
	}
}
