package categories

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Save crea (sin ID) o actualiza una categoría.
func (f *Feature) Save(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	name := utils.Text(in.Data, "name")
	if !utils.Required(name, 120) || (in.ID != "" && !utils.ValidID(in.ID)) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidCategory)
	}

	description := utils.Ptr(utils.Text(in.Data, "description"))
	var out models.ComplaintCategory

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		var err error

		if in.ID == "" {
			out, err = q.CreateCategory(
				ctx,
				repository.CreateCategoryParams{
					ID:             utils.NewID(),
					OrganizationID: p.OrganizationID,
					Name:           name,
					Description:    description,
					CreatedBy:      &p.UserID,
				},
			)
		} else {
			out, err = q.UpdateCategory(ctx, repository.UpdateCategoryParams{ID: in.ID, OrganizationID: p.OrganizationID, Name: name, Description: description, UpdatedBy: &p.UserID})
		}

		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditCategorySaved,
			constants.EntityCategory,
			out.ID,
			nil,
			map[string]string{"name": name},
		)
	})

	return operation.Record(out), err
}
