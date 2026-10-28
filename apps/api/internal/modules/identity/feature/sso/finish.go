package sso

import (
	"net/http"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// finish vincula o resuelve la identidad, emite la sesión si es login y redirige a /status.
func (f *Feature) finish(
	w http.ResponseWriter,
	r *http.Request,
	c repository.SSOConnectionDetails,
	a models.SSOLoginAttempt,
	issuer, subject string,
) error {
	ctx := r.Context()
	var raw string

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		userID, err := resolveUser(r, q, c, a, issuer, subject)
		if err != nil {
			return err
		}

		u, err := q.GetUser(ctx, userID)
		if err != nil || !u.Active {
			return apperrors.Denied()
		}

		m, err := q.GetMembership(ctx, repository.GetMembershipParams{UserID: userID, OrganizationID: c.OrganizationID})
		if err != nil || m.Status != constants.StatusActive {
			return apperrors.Denied()
		}

		if a.Purpose == constants.SSOTest {
			if m.Role != constants.RoleAdmin {
				return apperrors.Denied()
			}

			if err = apperrors.Changed(q.MarkSSOTested(ctx, repository.MarkSSOTestedParams{ID: c.ID, OrganizationID: c.OrganizationID, ConfigVersion: c.ConfigVersion})); err != nil {
				return err
			}
		}

		if a.Purpose == constants.SSOLogin {
			if utils.Value(m.ActiveConnectionID) != c.ID || m.LoginMode == constants.LoginModeLocal {
				return apperrors.Denied()
			}

			if raw, err = f.loginToken(userID, c, m.PolicyVersion); err != nil {
				return err
			}
		}

		return audit.Record(
			ctx,
			q,
			auth.Principal{UserID: userID, OrganizationID: c.OrganizationID},
			constants.AuditSSOPrefix+a.Purpose,
			constants.EntitySSOConnection,
			c.ID,
			nil,
			nil,
		)
	})
	if err != nil {
		return err
	}

	if raw != "" {
		issued, err := f.deps.Auth.IssueFromAccess(raw)
		if err != nil {
			return err
		}

		for _, cookie := range issued.Header.Values("Set-Cookie") {
			w.Header().Add("Set-Cookie", cookie)
		}
	}

	http.Redirect(w, r, constants.PathAuthStatus, http.StatusFound)

	return nil
}

// resolveUser vincula la identidad externa (test/link) o busca el usuario ya vinculado (login).
func resolveUser(
	r *http.Request,
	q *repository.Repository,
	c repository.SSOConnectionDetails,
	a models.SSOLoginAttempt,
	issuer, subject string,
) (string, error) {
	identity, err := q.FindSSOIdentity(
		r.Context(),
		repository.FindSSOIdentityParams{ConnectionID: c.ID, Issuer: issuer, Subject: subject},
	)

	if a.Purpose != constants.SSOLink && a.Purpose != constants.SSOTest {
		if err != nil {
			return "", apperrors.Denied()
		}

		return identity.UserID, nil
	}

	userID := utils.Value(a.UserID)
	if err == nil && identity.UserID != userID {
		return "", apperrors.Denied()
	}

	if err != nil && !repository.IsNotFound(err) {
		return "", err
	}

	return userID, apperrors.Changed(
		q.LinkSSOIdentity(
			r.Context(),
			repository.LinkSSOIdentityParams{
				ID:             utils.NewID(),
				OrganizationID: c.OrganizationID,
				ConnectionID:   c.ID,
				UserID:         userID,
				Issuer:         issuer,
				Subject:        subject,
			},
		),
	)
}

// loginToken abre la sesión SSO con la empresa activa y su grant de política.
func (f *Feature) loginToken(userID string, c repository.SSOConnectionDetails, policyVersion int32) (string, error) {
	_, raw, err := f.deps.Auth.NewContext(userID, c.Protocol)
	if err != nil {
		return "", err
	}

	grants := []auth.Grant{
		{OrganizationID: c.OrganizationID, ConnectionID: c.ID, PolicyVersion: policyVersion, Method: c.Protocol},
	}

	return f.deps.Auth.UpdateContext(raw, c.OrganizationID, grants)
}
