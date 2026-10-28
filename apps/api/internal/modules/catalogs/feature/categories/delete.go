package categories

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Delete elimina una categoría y la quita de los reclamos que la usaban.
func (f *Feature) Delete(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if !utils.ValidID(in.ID) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidCategory)
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := q.ClearCategoryReferences(ctx, repository.ClearCategoryReferencesParams{OrganizationID: p.OrganizationID, CategoryID: in.ID}); err != nil {
			return err
		}

		if err := apperrors.Changed(q.DeleteCategory(ctx, repository.DeleteCategoryParams{ID: in.ID, OrganizationID: p.OrganizationID})); err != nil {
			return err
		}

		return audit.Record(ctx, q, p, constants.AuditCategoryDeleted, constants.EntityCategory, in.ID, nil, nil)
	})

	return operation.Success(), err
}
