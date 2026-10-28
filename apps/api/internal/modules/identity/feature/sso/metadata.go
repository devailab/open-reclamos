package sso

import (
	"context"
	"encoding/xml"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
)

// Metadata devuelve la metadata SAML del SP o la callback OIDC para configurar el IdP.
func (f *Feature) Metadata(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	conn, err := f.deps.Repo.GetSSOConnection(ctx, in.ID)
	if err != nil || conn.OrganizationID != p.OrganizationID {
		return operation.Output{}, apperrors.Denied()
	}

	if conn.Protocol != constants.ProtocolSAML {
		return operation.Record(map[string]string{"callback_url": f.url(conn.ID, constants.SSOActionOIDCCallback)}), nil
	}

	sp, err := f.ServiceProvider(ctx, conn.ID)
	if err != nil {
		return operation.Output{}, err
	}

	b, err := xml.Marshal(sp.Metadata())

	return operation.File(b, "metadata.xml", constants.ContentTypeSAMLMetadata), err
}
