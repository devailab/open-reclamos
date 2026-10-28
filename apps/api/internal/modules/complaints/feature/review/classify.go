package review

import (
	"context"
	"slices"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Classify cambia prioridad y categoría del reclamo.
func (f *Feature) Classify(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		c, err := complaintutils.Load(ctx, q, p, in.ID, true)
		if err != nil {
			return err
		}

		if err = applyClassification(ctx, q, p, in); err != nil {
			return err
		}

		old := map[string]any{"priority": c.Priority, "category_id": c.CategoryID}

		if err = audit.Record(ctx, q, p, constants.AuditComplaintUpdated, constants.EntityComplaint, in.ID, old, in.Data); err != nil {
			return err
		}

		return f.deps.Jobs.EnqueueEvent(
			ctx,
			q,
			p.OrganizationID,
			in.ID,
			constants.EventComplaintUpdated,
			map[string]string{"priority": utils.Text(in.Data, "priority")},
		)
	})

	return operation.Success(), err
}

// applyClassification valida y guarda prioridad y categoría (también al responder).
func applyClassification(ctx context.Context, q *repository.Repository, p auth.Principal, in operation.Input) error {
	priority := utils.Text(in.Data, "priority")
	if !slices.Contains(constants.Priorities, priority) {
		return apperrors.Invalid(constants.MsgInvalidPriority)
	}

	category := utils.Text(in.Data, "category_id")
	if category != "" {
		if !utils.ValidID(category) {
			return apperrors.Invalid(constants.MsgInvalidCategory)
		}

		if _, err := q.GetCategory(ctx, repository.GetCategoryParams{ID: category, OrganizationID: p.OrganizationID}); err != nil {
			return err
		}
	}

	return apperrors.Changed(
		q.ClassifyComplaint(
			ctx,
			repository.ClassifyComplaintParams{
				ID:             in.ID,
				OrganizationID: p.OrganizationID,
				Priority:       priority,
				CategoryID:     category,
				UpdatedBy:      &p.UserID,
			},
		),
	)
}
