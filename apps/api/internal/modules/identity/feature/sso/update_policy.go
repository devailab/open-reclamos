package sso

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

// UpdatePolicy cambia el modo de acceso; activar SSO exige una conexión probada.
func (f *Feature) UpdatePolicy(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	mode, id := utils.Text(in.Data, "login_mode"), utils.Text(in.Data, "connection_id")
	if mode != constants.LoginModeLocal && mode != constants.LoginModeMixed && mode != constants.LoginModeSSORequired {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidAccessPolicy)
	}

	var out models.OrganizationAuthSetting

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if _, err := q.LockOrganization(ctx, p.OrganizationID); err != nil {
			return err
		}

		if mode != constants.LoginModeLocal {
			if err := activateConnection(ctx, q, p, id); err != nil {
				return err
			}
		} else {
			id = ""
		}

		var err error

		out, err = q.SetSSOPolicy(
			ctx,
			repository.SetSSOPolicyParams{OrganizationID: p.OrganizationID, LoginMode: mode, ConnectionID: id},
		)
		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditSSOPolicyUpdated,
			constants.EntityOrganization,
			p.OrganizationID,
			nil,
			map[string]string{"login_mode": mode},
		)
	})

	return operation.Record(out), err
}

func activateConnection(ctx context.Context, q *repository.Repository, p auth.Principal, id string) error {
	if !utils.ValidID(id) {
		return apperrors.Invalid(constants.MsgInvalidConnection)
	}

	conn, err := q.GetSSOConnection(ctx, id)
	if err != nil || conn.OrganizationID != p.OrganizationID {
		return apperrors.Denied()
	}

	if conn.TestedVersion == nil || *conn.TestedVersion != conn.ConfigVersion {
		return apperrors.Conflict(constants.MsgSSOTestFirst)
	}

	return apperrors.Changed(
		q.SetConnectionActive(
			ctx,
			repository.SetConnectionActiveParams{
				ID:             id,
				OrganizationID: p.OrganizationID,
				Status:         constants.StatusActive,
			},
		),
	)
}
