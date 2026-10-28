package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	// AccessLifetime es la vida máxima de un access token.
	AccessLifetime = 10 * time.Minute
	// LoginLifetime es la vida máxima de un login antes de volver a autenticarse.
	LoginLifetime = 24 * time.Hour
	issuer        = "open-reclamos"
)

// Grant autoriza una empresa que exige SSO dentro de la sesión.
type Grant struct {
	OrganizationID string `json:"organization_id"`
	ConnectionID   string `json:"connection_id"`
	PolicyVersion  int32  `json:"policy_version"`
	Method         string `json:"method"`
}

// Claims es el contenido firmado de los access y refresh tokens.
type Claims struct {
	jwt.RegisteredClaims
	ContextID      string  `json:"ctx"`
	OrganizationID string  `json:"organization_id,omitempty"`
	AuthMethod     string  `json:"auth_method"`
	AuthTime       int64   `json:"auth_time"`
	LoginExpires   int64   `json:"login_exp"`
	Kind           string  `json:"kind"`
	Grants         []Grant `json:"grants,omitempty"`
}

// Issued agrupa lo que recibe el cliente al emitir tokens.
type Issued struct {
	AccessToken     string
	AccessExpiresAt int64
	Header          http.Header
}

// Solo se usa al construir servicios directamente en pruebas; Config.Load carga claves persistentes.
var testJWTKeys = sync.OnceValue(func() [2][]byte {
	var keys [2][]byte

	for i := range keys {
		keys[i] = make([]byte, 32)

		if _, err := rand.Read(keys[i]); err != nil {
			panic(err)
		}
	}

	return keys
})

func (s *Service) tokenKey(kind string) ([]byte, error) {
	secret := s.Config.JWTAccessSecret
	index := 0

	if kind == constants.TokenRefresh {
		secret = s.Config.JWTRefreshSecret
		index = 1
	}

	if secret == "" && s.Config.JWTKeyFile == "" {
		return testJWTKeys()[index], nil
	}

	key, err := base64.StdEncoding.DecodeString(secret)
	if err != nil || len(key) < 32 {
		return nil, errors.New(constants.MsgJWTKeysNotConfigured)
	}

	return key, nil
}

// Sign firma claims como access o refresh token.
func (s *Service) Sign(claims Claims, kind string) (string, error) {
	now := time.Now()
	expires := time.Unix(claims.LoginExpires, 0)
	if !expires.After(now) {
		return "", apperrors.Unauthorized()
	}

	if kind == constants.TokenAccess && now.Add(AccessLifetime).Before(expires) {
		expires = now.Add(AccessLifetime)
	}

	claims.Kind = kind

	claims.RegisteredClaims = jwt.RegisteredClaims{
		Issuer:    issuer,
		Subject:   claims.Subject,
		Audience:  jwt.ClaimStrings{issuer + "-" + kind},
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(expires),
		ID:        utils.NewID(),
	}

	key, err := s.tokenKey(kind)
	if err != nil {
		return "", err
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token.Header["typ"] = issuer + "-" + kind + "+jwt"

	return token.SignedString(key)
}

// Parse valida firma, tipo, vigencia y coherencia de un token.
func (s *Service) Parse(raw, kind string) (Claims, error) {
	var claims Claims
	key, err := s.tokenKey(kind)
	if err != nil {
		return claims, err
	}

	token, err := jwt.ParseWithClaims(raw, &claims, func(t *jwt.Token) (any, error) {
		if t.Header["typ"] != issuer+"-"+kind+"+jwt" {
			return nil, apperrors.Unauthorized()
		}

		return key, nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(issuer), jwt.WithAudience(issuer+"-"+kind), jwt.WithExpirationRequired(), jwt.WithIssuedAt())
	if err != nil || token == nil || !token.Valid || claims.Kind != kind || claims.IssuedAt == nil ||
		claims.NotBefore == nil ||
		!utils.ValidID(claims.Subject) ||
		!utils.ValidID(claims.ContextID) ||
		(claims.OrganizationID != "" && !utils.ValidID(claims.OrganizationID)) ||
		claims.AuthTime <= 0 ||
		claims.AuthTime > time.Now().Unix() ||
		claims.LoginExpires <= time.Now().Unix() ||
		claims.LoginExpires-claims.AuthTime > int64(LoginLifetime/time.Second) ||
		claims.ExpiresAt.Time.After(time.Unix(claims.LoginExpires, 0)) ||
		(kind == constants.TokenAccess && claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time) > AccessLifetime) ||
		(claims.AuthMethod != constants.AuthLocal && claims.AuthMethod != constants.AuthOIDC && claims.AuthMethod != constants.AuthSAML) {
		return Claims{}, apperrors.Unauthorized()
	}

	return claims, nil
}

// Cookie crea una cookie HttpOnly; Secure se activa con PUBLIC_BASE_URL HTTPS.
func (s *Service) Cookie(name, raw, path string, expires time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     name,
		Value:    raw,
		Path:     path,
		HttpOnly: true,
		Secure:   strings.HasPrefix(s.Config.PublicBaseURL, "https://"),
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
	}
}

// Headers emite la cookie de refresh y limpia cookies heredadas.
func (s *Service) Headers(claims Claims) (http.Header, error) {
	refresh, err := s.Sign(claims, constants.TokenRefresh)
	if err != nil {
		return nil, err
	}

	return http.Header{"Set-Cookie": []string{
		s.Cookie(constants.CookieRefresh, refresh, constants.RefreshTokenPath, time.Unix(claims.LoginExpires, 0)).
			String(),
		s.Cookie(constants.CookieAccess, "", "/", time.Unix(1, 0)).String(),
		s.Cookie(constants.CookieSession, "", "/", time.Unix(1, 0)).String(),
	}, "Cache-Control": []string{"no-store"}}, nil
}

// LogoutHeaders expira todas las cookies de sesión.
func (s *Service) LogoutHeaders() http.Header {
	return http.Header{"Set-Cookie": []string{
		s.Cookie(constants.CookieAccess, "", "/", time.Unix(1, 0)).String(),
		s.Cookie(constants.CookieRefresh, "", constants.RefreshTokenPath, time.Unix(1, 0)).String(),
		s.Cookie(constants.CookieSession, "", "/", time.Unix(1, 0)).String(),
	}}
}

// Issue firma un access token nuevo y la cookie de refresh para los claims.
func (s *Service) Issue(claims Claims) (Issued, error) {
	access, err := s.Sign(claims, constants.TokenAccess)
	if err != nil {
		return Issued{}, err
	}

	parsed, err := s.Parse(access, constants.TokenAccess)
	if err != nil {
		return Issued{}, err
	}

	header, err := s.Headers(claims)
	if err != nil {
		return Issued{}, err
	}

	return Issued{AccessToken: access, AccessExpiresAt: parsed.ExpiresAt.Unix(), Header: header}, nil
}

// IssueFromAccess emite tokens a partir de un access token recién firmado.
func (s *Service) IssueFromAccess(raw string) (Issued, error) {
	claims, err := s.Parse(raw, constants.TokenAccess)
	if err != nil {
		return Issued{}, err
	}

	return s.Issue(claims)
}

// ContextClaims reconstruye los claims del contexto de login del principal.
func (s *Service) ContextClaims(p Principal) Claims {
	return Claims{
		RegisteredClaims: jwt.RegisteredClaims{Subject: p.UserID},
		ContextID:        p.SessionID,
		OrganizationID:   p.OrganizationID,
		AuthMethod:       p.AuthMethod,
		AuthTime:         p.Session.AuthenticatedAt.Unix(),
		LoginExpires:     p.Session.ExpiresAt.Unix(),
		Grants:           p.Grants,
	}
}

// NewContext inicia un login y devuelve su access token.
func (s *Service) NewContext(userID, method string) (Session, string, error) {
	now := time.Now()

	a := Session{
		ID:              utils.NewID(),
		UserID:          userID,
		AuthMethod:      method,
		AuthenticatedAt: now,
		ExpiresAt:       now.Add(LoginLifetime),
	}

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{Subject: userID},
		ContextID:        a.ID,
		AuthMethod:       method,
		AuthTime:         now.Unix(),
		LoginExpires:     a.ExpiresAt.Unix(),
	}

	raw, err := s.Sign(claims, constants.TokenAccess)

	return a, raw, err
}

// UpdateContext cambia la empresa activa (y opcionalmente los grants) de un access token.
func (s *Service) UpdateContext(raw, organizationID string, grants []Grant) (string, error) {
	claims, err := s.Parse(raw, constants.TokenAccess)
	if err != nil {
		return "", err
	}

	claims.OrganizationID = organizationID

	if grants != nil {
		claims.Grants = grants
	}

	return s.Sign(claims, constants.TokenAccess)
}
