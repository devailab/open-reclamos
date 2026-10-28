// Package captcha valida tokens de Cloudflare Turnstile.
package captcha

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/httpclient"
)

const verifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type Verifier struct {
	Config *config.Config
	HTTP   *httpclient.Clients
}

// Verify valida el token; si Turnstile está desactivado siempre acepta.
func (v *Verifier) Verify(ctx context.Context, token string) error {
	if !v.Config.TurnstileEnabled {
		return nil
	}

	values := url.Values{"secret": {v.Config.TurnstileSecretKey}, "response": {token}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, verifyURL, strings.NewReader(values.Encode()))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := v.HTTP.Safe(10 * time.Second).Do(req)
	if err != nil {
		return apperrors.Invalid(constants.MsgCaptchaUnavailable)
	}

	defer response.Body.Close()

	var data struct {
		Success bool `json:"success"`
	}

	if err = json.NewDecoder(io.LimitReader(response.Body, 1024*64)).Decode(&data); err != nil || !data.Success {
		return apperrors.Invalid(constants.MsgCaptchaInvalid)
	}

	return nil
}
