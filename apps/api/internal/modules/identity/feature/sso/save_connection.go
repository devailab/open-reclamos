package sso

import (
	"context"
	"net/url"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/crewjam/saml/samlsp"
	ssoutils "openreclamos.com/api/internal/modules/identity/utils"
	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// maxSAMLMetadata limita el XML de metadata del IdP.
const maxSAMLMetadata = 1024 * 1024

// SaveConnection crea o edita una conexión; la conexión activa no puede editarse.
func (f *Feature) SaveConnection(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	name, protocol := utils.Text(in.Data, "name"), utils.Text(in.Data, "protocol")
	if !utils.Required(name, 120) || (protocol != constants.ProtocolOIDC && protocol != constants.ProtocolSAML) {
		return operation.Output{}, apperrors.Invalid(constants.MsgSSONameAndProtocolRequired)
	}

	id := in.ID
	if id == "" {
		id = utils.NewID()
	} else if !utils.ValidID(id) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidConnection)
	}

	var oidcConfig repository.SaveOIDCConfigParams
	var samlConfig repository.SaveSAMLConfigParams
	var err error

	if protocol == constants.ProtocolOIDC {
		oidcConfig, err = f.oidcConfig(ctx, id, in.Data)
	} else {
		samlConfig, err = f.samlConfig(id, in.Data)
	}

	if err != nil {
		return operation.Output{}, err
	}

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if _, err := q.LockOrganization(ctx, p.OrganizationID); err != nil {
			return err
		}

		if in.ID == "" {
			if err := q.InsertSSOConnection(ctx, repository.InsertSSOConnectionParams{ID: id, OrganizationID: p.OrganizationID, Protocol: protocol, Name: name, CreatedBy: &p.UserID}); err != nil {
				return err
			}
		} else if err := checkEditable(ctx, q, p, id, protocol, oidcConfig); err != nil {
			return err
		} else if err := apperrors.Changed(q.UpdateSSOConnection(ctx, repository.UpdateSSOConnectionParams{ID: id, OrganizationID: p.OrganizationID, Name: name})); err != nil {
			return err
		}

		var err error

		if protocol == constants.ProtocolOIDC {
			err = q.SaveOIDCConfig(ctx, oidcConfig)
		} else {
			err = q.SaveSAMLConfig(ctx, samlConfig)
		}

		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditSSOConfigured,
			constants.EntitySSOConnection,
			id,
			nil,
			map[string]string{"protocol": protocol},
		)
	})

	return operation.Record(
		map[string]string{"id": id, "test_url": f.url(id, constants.SSOActionStart) + "?purpose=" + constants.SSOTest},
	), err
}

// oidcConfig valida el discovery del issuer y cifra el client secret.
func (f *Feature) oidcConfig(
	ctx context.Context,
	id string,
	d map[string]any,
) (repository.SaveOIDCConfigParams, error) {
	issuer, clientID, secret := utils.Text(d, "issuer_url"), utils.Text(d, "client_id"), utils.Text(d, "client_secret")
	u, err := url.Parse(issuer)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.RawQuery != "" || u.Fragment != "" ||
		clientID == "" ||
		secret == "" {
		return repository.SaveOIDCConfigParams{}, apperrors.Invalid(constants.MsgOIDCFieldsRequired)
	}

	if _, err = oidc.NewProvider(oidc.ClientContext(ctx, f.deps.HTTP.SSO), issuer); err != nil {
		return repository.SaveOIDCConfigParams{}, apperrors.Invalid(constants.MsgOIDCDiscoveryFailed)
	}

	encrypted, err := utils.Encrypt(f.deps.Config.SSOEncryptionKey, id, secret)
	if err != nil {
		return repository.SaveOIDCConfigParams{}, err
	}

	return repository.SaveOIDCConfigParams{
		ConnectionID:          id,
		IssuerUrl:             issuer,
		ClientID:              clientID,
		ClientSecretEncrypted: encrypted,
	}, nil
}

// samlConfig valida la metadata del IdP y genera el par de claves del SP.
func (f *Feature) samlConfig(id string, d map[string]any) (repository.SaveSAMLConfigParams, error) {
	metadata := utils.Text(d, "idp_metadata_xml")
	if len(metadata) > maxSAMLMetadata {
		return repository.SaveSAMLConfigParams{}, apperrors.Invalid(constants.MsgSAMLMetadataTooLarge)
	}

	md, err := samlsp.ParseMetadata([]byte(metadata))
	if err != nil || md.EntityID == "" || len(md.IDPSSODescriptors) == 0 {
		return repository.SaveSAMLConfigParams{}, apperrors.Invalid(constants.MsgSAMLMetadataInvalid)
	}

	cert, key, err := ssoutils.NewSPKey(id)
	if err != nil {
		return repository.SaveSAMLConfigParams{}, err
	}

	encrypted, err := utils.Encrypt(f.deps.Config.SSOEncryptionKey, id, key)
	if err != nil {
		return repository.SaveSAMLConfigParams{}, err
	}

	return repository.SaveSAMLConfigParams{
		ConnectionID:          id,
		IdpMetadataXml:        metadata,
		IdpEntityID:           md.EntityID,
		SpCertificate:         cert,
		SpPrivateKeyEncrypted: encrypted,
		SubjectAttribute:      utils.Ptr(utils.Text(d, "subject_attribute")),
		EmailAttribute:        "email",
		NameAttribute:         "name",
	}, nil
}

// checkEditable impide editar conexiones ajenas, la activa o cambiar la identidad del issuer.
func checkEditable(
	ctx context.Context,
	q *repository.Repository,
	p auth.Principal,
	id, protocol string,
	oidcConfig repository.SaveOIDCConfigParams,
) error {
	old, err := q.GetSSOConnection(ctx, id)
	if err != nil || old.OrganizationID != p.OrganizationID || old.Protocol != protocol {
		return apperrors.Denied()
	}

	policy, err := q.GetSSOSettings(ctx, p.OrganizationID)
	if err != nil {
		return err
	}

	if utils.Value(policy.ActiveConnectionID) == id {
		return apperrors.Conflict(constants.MsgSSOReplaceActive)
	}

	if protocol == constants.ProtocolOIDC {
		oldConfig, err := q.GetOIDCConfig(ctx, id)
		if err != nil {
			return err
		}

		if oldConfig.IssuerUrl != oidcConfig.IssuerUrl || oldConfig.ClientID != oidcConfig.ClientID {
			return apperrors.Conflict(constants.MsgSSOIssuerChange)
		}
	}

	return nil
}
