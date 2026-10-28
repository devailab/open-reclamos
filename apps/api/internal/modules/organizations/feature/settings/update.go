package settings

import (
	"context"
	"slices"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Update cambia plazo de respuesta, formulario público y herramientas MCP.
func (f *Feature) Update(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	days := utils.Number(in.Data, "response_deadline_days")
	if days < 1 || days > 365 {
		return operation.Output{}, apperrors.Invalid(constants.MsgDeadlineRange)
	}

	tools := utils.StringList(in.Data, "mcp_enabled_tools")

	for _, tool := range tools {
		if !slices.Contains(constants.MCPTools, tool) {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidMCPTool)
		}
	}

	var out models.OrganizationSetting

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		var err error

		out, err = q.UpdateSettings(
			ctx,
			repository.UpdateSettingsParams{
				OrganizationID:       p.OrganizationID,
				ResponseDeadlineDays: int32(days),
				FormEnabled:          utils.Bool(in.Data, "form_enabled"),
				McpEnabledTools:      utils.JSONBytes(tools),
				McpShowSensitiveData: utils.Bool(in.Data, "mcp_show_sensitive_data"),
				UpdatedBy:            &p.UserID,
			},
		)
		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditSettingsUpdated,
			constants.EntityOrganization,
			p.OrganizationID,
			nil,
			map[string]any{"response_deadline_days": days},
		)
	})

	return operation.Record(out), err
}
