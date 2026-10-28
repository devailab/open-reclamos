// Package rpc conecta las operaciones RPC del módulo de integraciones con sus features.
package rpc

import (
	"openreclamos.com/api/internal/modules/integrations/feature/email"
	"openreclamos.com/api/internal/modules/integrations/feature/lookup"
	"openreclamos.com/api/internal/modules/integrations/feature/webhooks"
	. "openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

func Register(r *operation.Registry, webhooks *webhooks.Feature, email *email.Feature, lookup *lookup.Feature) {
	r.Global(OpLookupDocument, lookup.Document)

	r.Tenant(OpTestEmail, PermissionAdmin, email.Test)

	r.Tenant(OpListWebhooks, PermissionAdmin, webhooks.List)
	r.Tenant(OpCreateWebhook, PermissionAdmin, webhooks.Save)
	r.Tenant(OpUpdateWebhook, PermissionAdmin, webhooks.Save)
	r.Tenant(OpDeleteWebhook, PermissionAdmin, webhooks.Delete)
	r.Tenant(OpListDeliveries, PermissionAdmin, webhooks.ListDeliveries)
	r.Tenant(OpRetryDelivery, PermissionAdmin, webhooks.RetryDelivery)
}
