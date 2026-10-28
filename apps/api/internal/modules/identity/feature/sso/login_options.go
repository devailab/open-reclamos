package sso

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// busca el acceso por slug o por el dominio empresarial escrito en el login.
func (f *Feature) LoginOptions(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	slug := in.ID
	_, byDomain := in.Data["business_domain"]

	if byDomain {
		domain := utils.NormalizeBusinessDomain(utils.Text(in.Data, "business_domain"))
		if domain == "" || !utils.ValidBusinessDomain(domain) {
			return operation.Output{}, apperrors.Invalid(constants.MsgSSODomainUnavailable)
		}

		organization, err := f.deps.Repo.GetOrganizationByBusinessDomain(ctx, domain)
		if err != nil {
			if !repository.IsNotFound(err) {
				return operation.Output{}, err
			}

			return operation.Output{}, apperrors.Invalid(constants.MsgSSODomainUnavailable)
		}

		slug = organization.Slug
	}

	organization, err := f.deps.Repo.GetPublicOrganization(ctx, slug)
	if err != nil {
		return operation.Output{}, err
	}

	policy, err := f.deps.Repo.GetSSOSettings(ctx, organization.ID)
	if err != nil {
		return operation.Output{}, err
	}

	data := map[string]any{
		"organization": map[string]any{"slug": organization.Slug, "name": organization.Name},
		"login_mode":   policy.LoginMode,
	}

	if policy.ActiveConnectionID != nil && policy.LoginMode != constants.LoginModeLocal {
		connection, err := f.deps.Repo.GetSSOConnection(ctx, *policy.ActiveConnectionID)
		if err != nil {
			return operation.Output{}, err
		}

		data["sso"] = map[string]string{
			"name":      connection.Name,
			"protocol":  connection.Protocol,
			"start_url": f.url(connection.ID, constants.SSOActionStart),
		}
	}

	if byDomain && data["sso"] == nil {
		return operation.Output{}, apperrors.Invalid(constants.MsgSSODomainUnavailable)
	}

	return operation.Record(data), nil
}
