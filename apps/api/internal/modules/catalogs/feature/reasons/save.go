package reasons

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

// Save crea (sin ID) o actualiza un motivo, evitando ciclos en la jerarquía.
func (f *Feature) Save(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	name, parent := utils.Text(in.Data, "reason"), utils.Text(in.Data, "parent_id")
	if !utils.Required(name, 300) || (in.ID != "" && !utils.ValidID(in.ID)) ||
		(parent != "" && !utils.ValidID(parent)) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidReason)
	}

	var out models.ComplaintReason

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if _, err := q.LockOrganization(ctx, p.OrganizationID); err != nil {
			return err
		}

		if err := checkHierarchy(ctx, q, p.OrganizationID, in.ID, parent); err != nil {
			return err
		}

		var err error

		if in.ID == "" {
			out, err = q.CreateReason(
				ctx,
				repository.CreateReasonParams{
					ID:             utils.NewID(),
					OrganizationID: p.OrganizationID,
					ParentID:       parent,
					Reason:         name,
					CreatedBy:      &p.UserID,
				},
			)
		} else {
			out, err = q.UpdateReason(ctx, repository.UpdateReasonParams{ID: in.ID, OrganizationID: p.OrganizationID, ParentID: parent, Reason: name, UpdatedBy: &p.UserID})
		}

		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditReasonSaved,
			constants.EntityReason,
			out.ID,
			nil,
			map[string]string{"reason": name},
		)
	})

	return operation.Record(out), err
}

// checkHierarchy recorre los ancestros de parent y falla si aparece id.
func checkHierarchy(ctx context.Context, q *repository.Repository, organizationID, id, parent string) error {
	seen := map[string]bool{id: true}
	cursor := parent

	for cursor != "" {
		if seen[cursor] {
			return apperrors.Invalid(constants.MsgReasonCycle)
		}

		seen[cursor] = true
		r, err := q.GetReason(ctx, repository.GetReasonParams{ID: cursor, OrganizationID: organizationID})
		if err != nil {
			return err
		}

		cursor = utils.Value(r.ParentID)
	}

	return nil
}
