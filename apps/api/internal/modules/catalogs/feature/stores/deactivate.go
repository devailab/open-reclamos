package stores

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// Deactivate desactiva (borrado lógico) una tienda autorizada.
func (f *Feature) Deactivate(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if err := validateScope(p.CanStore(in.ID), in.ID); err != nil {
		return operation.Output{}, err
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := apperrors.Changed(q.DeactivateStore(ctx, repository.DeactivateStoreParams{ID: in.ID, OrganizationID: p.OrganizationID, DeletedBy: &p.UserID})); err != nil {
			return err
		}

		return audit.Record(ctx, q, p, constants.AuditStoreDeactivated, constants.EntityStore, in.ID, nil, nil)
	})

	return operation.Success(), err
}
