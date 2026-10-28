package auth

import (
	"slices"
	"time"

	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
)

// Principal describe quién ejecuta una operación y en qué empresa.
type Principal struct {
	UserID, SessionID, OrganizationID, Role, AuthMethod string
	IsPlatform, AllStores                               bool
	StoreIDs                                            []string
	Session                                             Session
	Grants                                              []Grant
}

// Session es el contexto de login firmado dentro del JWT.
type Session struct {
	ID, UserID, AuthMethod, Name, LastName, Email string
	AuthenticatedAt, ExpiresAt                    time.Time
}

// CanStore indica si el principal puede ver la tienda.
func (p Principal) CanStore(id string) bool { return p.AllStores || slices.Contains(p.StoreIDs, id) }

// exige una sesión local sin limitar cuánto tiempo pasó desde el ingreso.
func MustLocal(p Principal) error {
	if p.AuthMethod != constants.AuthLocal {
		return apperrors.Denied()
	}

	return nil
}

// exige un administrador de plataforma.
func MustPlatformAdmin(p Principal) error {
	if !p.IsPlatform {
		return apperrors.Denied()
	}

	return nil
}
