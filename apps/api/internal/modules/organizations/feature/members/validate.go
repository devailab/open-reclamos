package members

import (
	"context"
	"slices"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// maxStoreIDs limita la lista de tiendas asignables en una sola petición.
const maxStoreIDs = 1000

// ValidateAccess revisa rol y tiendas; también lo usan las invitaciones.
func ValidateAccess(d map[string]any) error {
	if !slices.Contains(constants.MemberRoles, utils.Text(d, "role")) {
		return apperrors.Invalid(constants.MsgInvalidRole)
	}

	mode := utils.Text(d, "store_access_mode")
	if mode != constants.StoreAccessAll && mode != constants.StoreAccessSelected {
		return apperrors.Invalid(constants.MsgInvalidStoreAccess)
	}

	if raw, exists := d["store_ids"]; exists {
		ids, ok := raw.([]any)
		if !ok || len(ids) > maxStoreIDs {
			return apperrors.Invalid(constants.MsgInvalidStoreList)
		}

		for _, id := range ids {
			if _, ok := id.(string); !ok {
				return apperrors.Invalid(constants.MsgInvalidStore)
			}
		}
	}

	seen := map[string]bool{}

	for _, id := range utils.StringList(d, "store_ids") {
		if !utils.ValidID(id) || seen[id] {
			return apperrors.Invalid(constants.MsgInvalidStore)
		}

		seen[id] = true
	}

	return nil
}

// CanGrantStores impide que un admin con tiendas seleccionadas otorgue más acceso del que tiene.
func CanGrantStores(p auth.Principal, data map[string]any) error {
	if p.AllStores {
		return nil
	}

	if utils.Text(data, "store_access_mode") == constants.StoreAccessAll {
		return apperrors.Denied()
	}

	for _, id := range utils.StringList(data, "store_ids") {
		if !p.CanStore(id) {
			return apperrors.Denied()
		}
	}

	return nil
}

// protectLastAdmin impide dejar a la empresa sin administradores.
func protectLastAdmin(ctx context.Context, q *repository.Repository, p auth.Principal, userID, newRole string) error {
	if _, err := q.LockOrganization(ctx, p.OrganizationID); err != nil {
		return err
	}

	m, err := q.GetMembership(ctx, repository.GetMembershipParams{UserID: userID, OrganizationID: p.OrganizationID})
	if err != nil {
		return err
	}

	if m.Role == constants.RoleAdmin && newRole != constants.RoleAdmin {
		n, err := q.CountAdmins(ctx, p.OrganizationID)
		if err != nil {
			return err
		}

		if n <= 1 {
			return apperrors.Conflict(constants.MsgLastAdministrator)
		}
	}

	return nil
}
