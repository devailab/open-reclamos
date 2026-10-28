package sso

import (
	"net/http"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/crewjam/saml"
	"golang.org/x/oauth2"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	maxCallbackBytes = 2 * 1024 * 1024
	minStateLength   = 20
)

// Callback consume el intento, valida la respuesta del IdP y completa el login.
func (f *Feature) Callback(
	w http.ResponseWriter,
	r *http.Request,
	c repository.SSOConnectionDetails,
	action string,
) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxCallbackBytes)

	if err := r.ParseForm(); err != nil {
		return err
	}

	state := r.Form.Get("state")

	if c.Protocol == constants.ProtocolSAML {
		state = r.Form.Get("RelayState")
	}

	if len(state) < minStateLength {
		return apperrors.Denied()
	}

	cookie, err := r.Cookie(stateCookieName(state))
	if err != nil {
		return apperrors.Denied()
	}

	attempt, err := f.deps.Repo.ConsumeSSOAttempt(
		r.Context(),
		repository.ConsumeSSOAttemptParams{
			StateHash:    utils.Hash(state),
			ConnectionID: c.ID,
			BrowserHash:  utils.Hash(cookie.Value),
		},
	)
	if err != nil || attempt.ConfigVersion != c.ConfigVersion {
		return apperrors.Denied()
	}

	var issuer, subject string

	switch {
	case c.Protocol == constants.ProtocolOIDC && action == constants.SSOActionOIDCCallback:
		issuer, subject, err = f.oidcIdentity(r, c, attempt)

	case c.Protocol == constants.ProtocolSAML && action == constants.SSOActionSAMLACS:
		issuer, subject, err = f.samlIdentity(r, c, attempt)

	default:
		err = apperrors.Denied()
	}

	if err != nil {
		return err
	}

	if subject == "" || issuer == "" {
		return apperrors.Invalid(constants.MsgSSOMissingSubject)
	}

	return f.finish(w, r, c, attempt, issuer, subject)
}

func (f *Feature) oidcIdentity(
	r *http.Request,
	c repository.SSOConnectionDetails,
	attempt models.SSOLoginAttempt,
) (string, string, error) {
	oauth, provider, clientID, err := f.oauthConfig(r, c)
	if err != nil {
		return "", "", err
	}

	verifier, err := utils.Decrypt(f.deps.Config.SSOEncryptionKey, c.ID, utils.Value(attempt.PkceVerifierEncrypted))
	if err != nil {
		return "", "", err
	}

	ctx := oidc.ClientContext(r.Context(), f.deps.HTTP.SSO)
	tok, err := oauth.Exchange(ctx, r.Form.Get("code"), oauth2.VerifierOption(verifier))
	if err != nil {
		return "", "", err
	}

	raw, ok := tok.Extra("id_token").(string)
	if !ok {
		return "", "", apperrors.Denied()
	}

	idToken, err := provider.VerifierContext(ctx, &oidc.Config{ClientID: clientID}).Verify(ctx, raw)
	if err != nil || idToken.Nonce != utils.Value(attempt.Nonce) {
		return "", "", apperrors.Denied()
	}

	return idToken.Issuer, idToken.Subject, nil
}

func (f *Feature) samlIdentity(
	r *http.Request,
	c repository.SSOConnectionDetails,
	attempt models.SSOLoginAttempt,
) (string, string, error) {
	sp, err := f.ServiceProvider(r.Context(), c.ID)
	if err != nil {
		return "", "", err
	}

	clone := r.Clone(r.Context())
	clone.URL = &sp.AcsURL
	assertion, err := sp.ParseResponse(clone, []string{utils.Value(attempt.SamlRequestID)})
	if err != nil {
		return "", "", err
	}

	if err = f.deps.Repo.SetAssertionID(r.Context(), repository.SetAssertionIDParams{ID: attempt.ID, AssertionID: &assertion.ID}); err != nil {
		return "", "", err
	}

	cfg, err := f.deps.Repo.GetSAMLConfig(r.Context(), c.ID)
	if err != nil {
		return "", "", err
	}

	subject := ""

	if cfg.SubjectAttribute != nil {
		for _, statement := range assertion.AttributeStatements {
			for _, attribute := range statement.Attributes {
				if attribute.Name == *cfg.SubjectAttribute && len(attribute.Values) > 0 {
					subject = attribute.Values[0].Value
				}
			}
		}
	} else if assertion.Subject != nil && assertion.Subject.NameID != nil && assertion.Subject.NameID.Format == string(saml.PersistentNameIDFormat) {
		subject = assertion.Subject.NameID.Value
	}

	return assertion.Issuer.Value, subject, nil
}
