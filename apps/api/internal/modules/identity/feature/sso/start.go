package sso

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/crewjam/saml"
	"golang.org/x/oauth2"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// attemptLifetime es el tiempo máximo entre iniciar y completar un login SSO.
const attemptLifetime = 10 * time.Minute

// Start registra el intento y redirige al IdP (o devuelve la URL en JSON si es POST).
func (f *Feature) Start(w http.ResponseWriter, r *http.Request, c repository.SSOConnectionDetails) error {
	purpose := r.URL.Query().Get("purpose")
	if purpose == "" {
		purpose = constants.SSOLogin
	}

	userID, err := f.startUser(r, c, purpose)
	if err != nil {
		return err
	}

	browser, state, nonce := utils.Token(), utils.Token(), utils.Token()

	attempt := repository.InsertSSOAttemptParams{
		ID:             utils.NewID(),
		OrganizationID: c.OrganizationID,
		ConnectionID:   c.ID,
		ConfigVersion:  c.ConfigVersion,
		Purpose:        purpose,
		UserID:         userID,
		StateHash:      utils.Hash(state),
		BrowserHash:    utils.Hash(browser),
		Nonce:          &nonce,
		ExpiresAt:      time.Now().Add(attemptLifetime),
	}

	var redirect string

	if c.Protocol == constants.ProtocolOIDC {
		redirect, err = f.oidcRedirect(r, c, &attempt, state, nonce)
	} else {
		redirect, err = f.samlRedirect(r, c, &attempt, state)
	}

	if err != nil {
		return err
	}

	if err := f.deps.Repo.InsertSSOAttempt(r.Context(), attempt); err != nil {
		return err
	}

	http.SetCookie(w, f.browserCookie(c, state, browser))

	if r.Method == http.MethodPost {
		w.Header().Set("Content-Type", constants.ContentTypeJSON)

		return json.NewEncoder(w).Encode(map[string]string{"url": redirect})
	}

	http.Redirect(w, r, redirect, http.StatusFound)

	return nil
}

// startUser valida el propósito: test y link exigen un admin/miembro con sesión local.
func (f *Feature) startUser(r *http.Request, c repository.SSOConnectionDetails, purpose string) (string, error) {
	if purpose != constants.SSOTest && purpose != constants.SSOLink {
		if purpose != constants.SSOLogin || c.Status != constants.StatusActive {
			return "", apperrors.Denied()
		}

		return "", nil
	}

	p, err := f.deps.Auth.Authenticate(r.Context(), r.Header)
	if err != nil {
		return "", err
	}

	if auth.MustLocal(p) != nil {
		return "", apperrors.Denied()
	}

	m, err := f.deps.Repo.GetMembership(
		r.Context(),
		repository.GetMembershipParams{UserID: p.UserID, OrganizationID: c.OrganizationID},
	)
	if err != nil || (purpose == constants.SSOTest && m.Role != constants.RoleAdmin) {
		return "", apperrors.Denied()
	}

	return p.UserID, nil
}

func (f *Feature) oauthConfig(
	r *http.Request,
	c repository.SSOConnectionDetails,
) (oauth2.Config, *oidc.Provider, string, error) {
	cfg, err := f.deps.Repo.GetOIDCConfig(r.Context(), c.ID)
	if err != nil {
		return oauth2.Config{}, nil, "", err
	}

	provider, err := oidc.NewProvider(oidc.ClientContext(r.Context(), f.deps.HTTP.SSO), cfg.IssuerUrl)
	if err != nil {
		return oauth2.Config{}, nil, "", err
	}

	secret, err := utils.Decrypt(f.deps.Config.SSOEncryptionKey, c.ID, cfg.ClientSecretEncrypted)
	if err != nil {
		return oauth2.Config{}, nil, "", err
	}

	return oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: secret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  f.url(c.ID, constants.SSOActionOIDCCallback),
		Scopes:       cfg.Scopes,
	}, provider, cfg.ClientID, nil
}

func (f *Feature) oidcRedirect(
	r *http.Request,
	c repository.SSOConnectionDetails,
	attempt *repository.InsertSSOAttemptParams,
	state, nonce string,
) (string, error) {
	oauth, _, _, err := f.oauthConfig(r, c)
	if err != nil {
		return "", err
	}

	verifier := oauth2.GenerateVerifier()
	encrypted, err := utils.Encrypt(f.deps.Config.SSOEncryptionKey, c.ID, verifier)
	if err != nil {
		return "", err
	}

	attempt.PkceVerifierEncrypted = &encrypted

	return oauth.AuthCodeURL(state, oauth2.S256ChallengeOption(verifier), oidc.Nonce(nonce)), nil
}

func (f *Feature) samlRedirect(
	r *http.Request,
	c repository.SSOConnectionDetails,
	attempt *repository.InsertSSOAttemptParams,
	state string,
) (string, error) {
	if !strings.HasPrefix(f.deps.Config.PublicBaseURL, "https://") {
		return "", apperrors.Invalid(constants.MsgSAMLNeedsHTTPS)
	}

	sp, err := f.ServiceProvider(r.Context(), c.ID)
	if err != nil {
		return "", err
	}

	location := sp.GetSSOBindingLocation(saml.HTTPRedirectBinding)
	if location == "" {
		return "", apperrors.Invalid(constants.MsgSAMLRedirectBinding)
	}

	request, err := sp.MakeAuthenticationRequest(location, saml.HTTPRedirectBinding, saml.HTTPPostBinding)
	if err != nil {
		return "", err
	}

	attempt.SamlRequestID = &request.ID
	u, err := request.Redirect(state, sp)
	if err != nil {
		return "", err
	}

	return u.String(), nil
}

// browserCookie liga el intento al navegador que lo inició.
func (f *Feature) browserCookie(c repository.SSOConnectionDetails, state, browser string) *http.Cookie {
	cookie := &http.Cookie{
		Name:     stateCookieName(state),
		Value:    browser,
		Path:     constants.PathSSO + c.ID + "/",
		HttpOnly: true,
		Secure:   strings.HasPrefix(f.deps.Config.PublicBaseURL, "https://"),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(attemptLifetime / time.Second),
	}

	// El POST del IdP al ACS es cross-site.
	if c.Protocol == constants.ProtocolSAML {
		cookie.SameSite = http.SameSiteNoneMode
	}

	return cookie
}

func stateCookieName(state string) string { return "sso_" + utils.Hash(state)[:16] }
