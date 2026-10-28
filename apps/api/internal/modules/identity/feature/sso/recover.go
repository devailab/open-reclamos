package sso

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// Recover vuelve la empresa a acceso local; solo accesible desde la consola del operador.
func (f *Feature) Recover(ctx context.Context, organizationID string) error {
	if !utils.ValidID(organizationID) {
		return apperrors.Invalid(constants.MsgInvalidOrganization)
	}

	return f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if _, err := q.GetOrganization(ctx, organizationID); err != nil {
			return err
		}

		if _, err := q.SetSSOPolicy(ctx, repository.SetSSOPolicyParams{OrganizationID: organizationID, LoginMode: constants.LoginModeLocal}); err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			auth.Principal{OrganizationID: organizationID},
			constants.AuditSSORecovered,
			constants.EntityOrganization,
			organizationID,
			nil,
			nil,
		)
	})
}
