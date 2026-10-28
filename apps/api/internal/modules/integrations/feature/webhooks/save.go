package webhooks

import (
	"context"
	"net/url"
	"slices"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/httpclient"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	defaultTimeoutMs = 15000
	minTimeoutMs     = 1000
	maxTimeoutMs     = 30000
	minSecretLength  = 16
	maxSecretLength  = 256
)

// Save crea (sin ID) o actualiza un webhook HTTPS hacia un destino público.
func (f *Feature) Save(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	d := in.Data
	name, target, status := utils.Text(d, "name"), utils.Text(d, "target_url"), utils.Text(d, "status")
	events := utils.StringList(d, "events")
	if !utils.Required(name, 120) || (status != constants.StatusActive && status != constants.StatusInactive) ||
		len(events) == 0 {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidWebhookData)
	}

	for _, event := range events {
		if !slices.Contains(constants.WebhookEvents, event) {
			return operation.Output{}, apperrors.Invalid(constants.MsgUnknownEvent)
		}
	}

	if err := validateTarget(ctx, target); err != nil {
		return operation.Output{}, err
	}

	timeout := utils.Number(d, "timeout_ms")
	if timeout == 0 {
		timeout = defaultTimeoutMs
	}

	if timeout < minTimeoutMs || timeout > maxTimeoutMs {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidTimeout)
	}

	id := in.ID
	if id == "" {
		id = utils.NewID()
	} else if !utils.ValidID(id) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidWebhook)
	}

	encrypted, err := f.encryptSecret(id, utils.Text(d, "secret"), in.ID == "")
	if err != nil {
		return operation.Output{}, err
	}

	var out any

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		var err error

		if in.ID == "" {
			slug := utils.Text(d, "slug")
			if slug == "" {
				slug = "webhook-" + id
			}

			if !utils.SlugPattern.MatchString(slug) {
				return apperrors.Invalid(constants.MsgInvalidSlug)
			}

			out, err = q.CreateWebhook(
				ctx,
				repository.CreateWebhookParams{
					ID:              id,
					OrganizationID:  p.OrganizationID,
					Name:            name,
					Slug:            slug,
					TargetUrl:       target,
					Events:          utils.JSONBytes(events),
					Status:          status,
					SecretEncrypted: utils.Ptr(encrypted),
					TimeoutMs:       int32(timeout),
					CreatedBy:       &p.UserID,
				},
			)
		} else {
			out, err = q.UpdateWebhook(ctx, repository.UpdateWebhookParams{ID: id, OrganizationID: p.OrganizationID, Name: name, TargetUrl: target, Events: utils.JSONBytes(events), Status: status, SecretEncrypted: encrypted, TimeoutMs: int32(timeout), UpdatedBy: &p.UserID})
		}

		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditWebhookSaved,
			constants.EntityWebhook,
			id,
			nil,
			map[string]any{"name": name, "events": events},
		)
	})

	return operation.Record(out), err
}

// validateTarget exige HTTPS sin credenciales y un host que resuelva a IP públicas.
func validateTarget(ctx context.Context, target string) error {
	u, err := url.Parse(target)
	if err != nil || u.Host == "" || u.Scheme != "https" || u.User != nil {
		return apperrors.Invalid(constants.MsgWebhookMustBeHTTPS)
	}

	if err = httpclient.PublicHost(ctx, u.Hostname()); err != nil {
		return apperrors.Invalid(constants.MsgWebhookTargetForbidden)
	}

	return nil
}

// encryptSecret cifra el secreto; al crear es obligatorio, al editar vacío conserva el actual.
func (f *Feature) encryptSecret(id, secret string, creating bool) (string, error) {
	if (creating || secret != "") && (len(secret) < minSecretLength || len(secret) > maxSecretLength) {
		return "", apperrors.Invalid(constants.MsgWebhookSecretLength)
	}

	if secret == "" {
		return "", nil
	}

	return utils.Encrypt(f.deps.Config.WebhookEncryptionKey, id, secret)
}
