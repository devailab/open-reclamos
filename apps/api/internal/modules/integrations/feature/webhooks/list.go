package webhooks

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
)

// List devuelve los webhooks de la empresa.
func (f *Feature) List(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	webhooks, err := f.deps.Repo.ListWebhooks(ctx, p.OrganizationID)

	return operation.Rows(webhooks, in), err
}

// ListDeliveries devuelve el historial de entregas.
func (f *Feature) ListDeliveries(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	deliveries, err := f.deps.Repo.ListWebhookDeliveries(ctx, p.OrganizationID)

	return operation.Rows(deliveries, in), err
}
