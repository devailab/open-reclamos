package sso

import (
	"context"
	"crypto/x509"
	"encoding/pem"
	"net/url"
	"time"

	"github.com/crewjam/saml"
	"github.com/crewjam/saml/samlsp"
	dsig "github.com/russellhaering/goxmldsig"
	ssoutils "openreclamos.com/api/internal/modules/identity/utils"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// ServiceProvider construye el SP SAML de una conexión con su clave descifrada.
func (f *Feature) ServiceProvider(ctx context.Context, id string) (*saml.ServiceProvider, error) {
	cfg, err := f.deps.Repo.GetSAMLConfig(ctx, id)
	if err != nil {
		return nil, err
	}

	keyPEM, err := utils.Decrypt(f.deps.Config.SSOEncryptionKey, id, cfg.SpPrivateKeyEncrypted)
	if err != nil {
		return nil, err
	}

	keyBlock, _ := pem.Decode([]byte(keyPEM))
	certBlock, _ := pem.Decode([]byte(cfg.SpCertificate))
	if keyBlock == nil || certBlock == nil {
		return nil, apperrors.Invalid(constants.MsgSAMLCertificateInvalid)
	}

	key, err := x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
	if err != nil {
		return nil, err
	}

	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil || time.Now().After(cert.NotAfter) {
		return nil, apperrors.Invalid(constants.MsgSAMLCertificateExpired)
	}

	md, err := samlsp.ParseMetadata([]byte(cfg.IdpMetadataXml))
	if err != nil {
		return nil, err
	}

	metadataURL, _ := url.Parse(f.url(id, constants.SSOActionSAMLMetadata))
	acs, _ := url.Parse(f.url(id, constants.SSOActionSAMLACS))

	return &saml.ServiceProvider{
		EntityID:          metadataURL.String(),
		MetadataURL:       *metadataURL,
		AcsURL:            *acs,
		Key:               key,
		Certificate:       cert,
		IDPMetadata:       md,
		AuthnNameIDFormat: saml.PersistentNameIDFormat,
		SignatureMethod:   dsig.RSASHA256SignatureMethod,
		SignatureVerifier: ssoutils.ModernSignatureVerifier{},
		AllowIDPInitiated: false,
		HTTPClient:        f.deps.HTTP.SSO,
	}, nil
}
