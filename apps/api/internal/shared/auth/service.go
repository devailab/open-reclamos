// Package auth resuelve quién llama (JWT o clave API), su empresa activa y sus tiendas.
package auth

import (
	"context"
	"net/http"
	"slices"
	"strings"
	"time"

	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

type Service struct {
	Repo   *repository.Repository
	Config *config.Config
}

func NewService(repo *repository.Repository, cfg *config.Config) *Service {
	return &Service{Repo: repo, Config: cfg}
}

// Authenticate valida el header Authorization (JWT o clave API).
func (s *Service) Authenticate(ctx context.Context, header http.Header) (Principal, error) {
	authorization := header.Get("Authorization")
	if !strings.HasPrefix(authorization, "Bearer ") {
		return Principal{}, apperrors.Unauthorized()
	}

	bearer := strings.TrimPrefix(authorization, "Bearer ")
	if bearer == "" || strings.ContainsAny(bearer, " \t\r\n") {
		return Principal{}, apperrors.Unauthorized()
	}

	if !strings.Contains(bearer, ".") {
		return s.authenticateAPIKey(ctx, bearer)
	}

	claims, err := s.Parse(bearer, constants.TokenAccess)
	if err != nil {
		return Principal{}, apperrors.Unauthorized()
	}

	user, err := s.Repo.GetUser(ctx, claims.Subject)
	if err != nil || !user.Active {
		return Principal{}, apperrors.Unauthorized()
	}

	return Principal{
		UserID:         user.ID,
		SessionID:      claims.ContextID,
		OrganizationID: claims.OrganizationID,
		IsPlatform:     user.IsSuperAdmin,
		AuthMethod:     claims.AuthMethod,
		Grants:         claims.Grants,
		Session: Session{
			ID:              claims.ContextID,
			UserID:          user.ID,
			Name:            user.Name,
			LastName:        user.LastName,
			Email:           user.Email,
			AuthMethod:      claims.AuthMethod,
			AuthenticatedAt: time.Unix(claims.AuthTime, 0),
			ExpiresAt:       time.Unix(claims.LoginExpires, 0),
		},
	}, nil
}

func (s *Service) authenticateAPIKey(ctx context.Context, bearer string) (Principal, error) {
	key, err := s.Repo.ResolveAPIKey(ctx, utils.Hash(bearer))
	if err != nil {
		return Principal{}, apperrors.Unauthorized()
	}

	u, err := s.Repo.GetUser(ctx, key.UserID)
	if err != nil || !u.Active {
		return Principal{}, apperrors.Unauthorized()
	}

	return Principal{UserID: key.UserID, OrganizationID: key.OrganizationID, AuthMethod: constants.AuthAPI}, nil
}

// pide la contraseña para cada cambio sensible de plataforma.
func (s *Service) ConfirmPlatformAction(ctx context.Context, p Principal, password string) error {
	if err := MustPlatformAdmin(p); err != nil {
		return err
	}

	if password == "" {
		return apperrors.Conflict(constants.MsgPlatformPasswordRequired)
	}

	encoded, err := s.Repo.GetCredentialPassword(ctx, p.UserID)
	if err != nil || !CheckPassword(utils.Value(encoded), password) {
		return apperrors.Conflict(constants.MsgPlatformPasswordInvalid)
	}

	return nil
}

// Tenant completa rol y tiendas del principal en la empresa, validando membresía y política SSO.
func (s *Service) Tenant(ctx context.Context, p Principal, organizationID string) (Principal, error) {
	if p.AuthMethod == constants.AuthAPI && p.OrganizationID != organizationID {
		return p, apperrors.Denied()
	}

	if !utils.ValidID(organizationID) {
		return p, apperrors.Denied()
	}

	m, err := s.Repo.GetMembership(
		ctx,
		repository.GetMembershipParams{UserID: p.UserID, OrganizationID: organizationID},
	)
	if err != nil || m.Status != constants.StatusActive {
		return p, apperrors.Denied()
	}

	localAllowed := p.AuthMethod == constants.AuthLocal && m.LoginMode != constants.LoginModeSSORequired
	if p.AuthMethod != constants.AuthAPI && !localAllowed {
		validGrant := false

		for _, grant := range p.Grants {
			if grant.OrganizationID == organizationID && grant.PolicyVersion == m.PolicyVersion &&
				grant.ConnectionID == utils.Value(m.ActiveConnectionID) &&
				slices.Contains([]string{constants.AuthOIDC, constants.AuthSAML}, grant.Method) {
				validGrant = true
			}
		}

		if !validGrant {
			return p, apperrors.Denied()
		}
	}

	p.OrganizationID = organizationID
	p.Role = m.Role
	p.AllStores = m.StoreAccessMode == constants.StoreAccessAll

	p.StoreIDs, err = s.Repo.GetAssignedStores(
		ctx,
		repository.GetAssignedStoresParams{UserID: p.UserID, OrganizationID: organizationID},
	)

	return p, err
}

// Authorize autentica, resuelve la empresa activa y exige el permiso indicado.
func (s *Service) Authorize(ctx context.Context, header http.Header, permission string) (Principal, error) {
	p, err := s.Authenticate(ctx, header)
	if err != nil {
		return p, err
	}

	p, err = s.Tenant(ctx, p, p.OrganizationID)
	if err != nil {
		return p, err
	}

	if !constants.Allowed(p.Role, permission) {
		return p, apperrors.Denied()
	}

	return p, nil
}
