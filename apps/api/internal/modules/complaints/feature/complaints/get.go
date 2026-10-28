package complaints

import (
	"context"

	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
)

// auditHistoryLimit es la cantidad de eventos de auditoría mostrados en el detalle.
const auditHistoryLimit = 100

// Get devuelve el reclamo con detalle, historial, adjuntos, entregas, auditoría y catálogos.
func (f *Feature) Get(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	repo := f.deps.Repo
	c, err := complaintutils.Load(ctx, repo, p, in.ID, false)
	if err != nil {
		return operation.Output{}, err
	}

	details, err := repo.GetComplaintDetails(
		ctx,
		repository.GetComplaintDetailsParams{OrganizationID: p.OrganizationID, ComplaintID: c.ID},
	)
	if err != nil && !repository.IsNotFound(err) {
		return operation.Output{}, err
	}

	history, err := repo.ListHistory(ctx, repository.ListHistoryParams{OrganizationID: p.OrganizationID, ID: c.ID})
	if err != nil {
		return operation.Output{}, err
	}

	attachments, err := repo.ListAttachments(
		ctx,
		repository.ListAttachmentsParams{OrganizationID: p.OrganizationID, ID: c.ID},
	)
	if err != nil {
		return operation.Output{}, err
	}

	deliveries, err := repo.GetDeliveries(
		ctx,
		repository.GetDeliveriesParams{OrganizationID: p.OrganizationID, ComplaintID: c.ID},
	)
	if err != nil && !repository.IsNotFound(err) {
		return operation.Output{}, err
	}

	store, err := repo.GetHistoricalStore(
		ctx,
		repository.GetStoreParams{ID: c.StoreID, OrganizationID: p.OrganizationID},
	)
	if err != nil {
		return operation.Output{}, err
	}

	var category any

	if c.CategoryID != nil {
		category, err = repo.GetCategory(
			ctx,
			repository.GetCategoryParams{ID: *c.CategoryID, OrganizationID: p.OrganizationID},
		)
		if err != nil {
			return operation.Output{}, err
		}
	}

	var reason any

	if c.ReasonID != nil {
		reason, err = repo.GetHistoricalReason(
			ctx,
			repository.GetReasonParams{ID: *c.ReasonID, OrganizationID: p.OrganizationID},
		)
		if err != nil {
			return operation.Output{}, err
		}
	}

	var ubigeo any

	if c.UbigeoID != nil {
		ubigeo, err = repo.GetUbigeo(ctx, *c.UbigeoID)
		if err != nil {
			return operation.Output{}, err
		}
	}

	auditHistory, err := repo.SearchAudit(
		ctx,
		repository.AuditFilter{
			OrganizationID: p.OrganizationID,
			AllStores:      true,
			EntityID:       c.ID,
			PageSize:       auditHistoryLimit,
		},
	)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Record(
		map[string]any{
			"complaint":     c,
			"details":       details,
			"history":       history,
			"attachments":   attachments,
			"deliveries":    deliveries,
			"audit_history": auditHistory,
			"store":         store,
			"category":      category,
			"reason":        reason,
			"ubigeo":        ubigeo,
		},
	), nil
}
