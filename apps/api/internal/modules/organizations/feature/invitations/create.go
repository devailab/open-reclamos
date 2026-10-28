package invitations

import (
	"context"
	"strings"
	"time"

	"openreclamos.com/api/internal/modules/organizations/feature/members"
	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Create genera una invitación con rol y tiendas; devuelve el enlace una sola vez.
func (f *Feature) Create(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if err := members.ValidateAccess(in.Data); err != nil {
		return operation.Output{}, err
	}

	if err := members.CanGrantStores(p, in.Data); err != nil {
		return operation.Output{}, err
	}

	email := strings.ToLower(utils.Text(in.Data, "email"))
	if !utils.ValidEmail(email) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidEmail)
	}

	mode := utils.Text(in.Data, "store_access_mode")
	id, raw := utils.NewID(), utils.Token()

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := q.CreateInvitation(ctx, repository.CreateInvitationParams{ID: id, OrganizationID: p.OrganizationID, Role: utils.Text(in.Data, "role"), Email: email, TokenHash: utils.Hash(raw), StoreAccessMode: mode, ExpiresAt: time.Now().Add(lifetime), CreatedBy: &p.UserID}); err != nil {
			return err
		}

		if mode == constants.StoreAccessSelected {
			for _, storeID := range utils.StringList(in.Data, "store_ids") {
				if _, err := q.GetStore(ctx, repository.GetStoreParams{ID: storeID, OrganizationID: p.OrganizationID}); err != nil {
					return err
				}

				if err := q.AssignInvitationStore(ctx, repository.AssignInvitationStoreParams{InvitationID: id, OrganizationID: p.OrganizationID, StoreID: storeID}); err != nil {
					return err
				}
			}
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditInvitationCreated,
			constants.EntityInvitation,
			id,
			nil,
			map[string]string{"email": email},
		)
	})

	return operation.Record(map[string]string{"id": id, "token": raw, "url": f.link(raw)}), err
}
