// Package audit registra acciones en la auditoría dentro de la transacción del cambio.
package audit

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/utils"
)

// Record guarda quién hizo action sobre entity/id, con los datos anteriores y nuevos.
func Record(
	ctx context.Context,
	q *repository.Repository,
	p auth.Principal,
	action, entity, id string,
	old, new any,
) error {
	return q.AddAudit(
		ctx,
		repository.AddAuditParams{
			ID:             utils.NewID(),
			OrganizationID: p.OrganizationID,
			UserID:         p.UserID,
			Action:         action,
			EntityType:     entity,
			EntityID:       id,
			OldData:        utils.JSONBytes(old),
			NewData:        utils.JSONBytes(new),
		},
	)
}
