// Package utils contiene utilidades que solo usa el módulo de identidad.
package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"slices"
	"time"

	"github.com/beevik/etree"
	dsig "github.com/russellhaering/goxmldsig"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
)

// NewSPKey genera el certificado y la clave privada (PEM) del Service Provider SAML.
func NewSPKey(id string) (string, string, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", "", err
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return "", "", err
	}

	template := x509.Certificate{
		SerialNumber:       serial,
		Subject:            pkix.Name{CommonName: "Open Reclamos " + id},
		NotBefore:          time.Now().Add(-time.Minute),
		NotAfter:           time.Now().AddDate(2, 0, 0),
		KeyUsage:           x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		SignatureAlgorithm: x509.SHA256WithRSA,
	}

	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return "", "", err
	}

	certificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	private := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})

	return string(certificate), string(private), nil
}

var allowedSignatureMethods = []string{
	dsig.RSASHA256SignatureMethod,
	dsig.RSASHA384SignatureMethod,
	dsig.RSASHA512SignatureMethod,
	dsig.ECDSASHA256SignatureMethod,
	dsig.ECDSASHA384SignatureMethod,
	dsig.ECDSASHA512SignatureMethod,
}

var allowedDigestMethods = []string{
	"http://www.w3.org/2001/04/xmlenc#sha256",
	"http://www.w3.org/2001/04/xmldsig-more#sha384",
	"http://www.w3.org/2001/04/xmlenc#sha512",
}

// ModernSignatureVerifier rechaza firmas SAML con SHA-1 u otros algoritmos débiles.
type ModernSignatureVerifier struct{}

// VerifySignature recibe el elemento firmado ya descifrado y su trust store.
func (ModernSignatureVerifier) VerifySignature(
	validationContext *dsig.ValidationContext,
	element *etree.Element,
) error {
	if !ModernSAMLSignature(element.SelectElement("Signature")) {
		return apperrors.Invalid(constants.MsgSAMLSignatureAlgorithm)
	}

	_, err := validationContext.Validate(element)

	return err
}

// ModernSAMLSignature indica si todos los algoritmos de firma y digest son modernos.
func ModernSAMLSignature(signature *etree.Element) bool {
	if signature == nil {
		return false
	}

	for _, method := range signature.FindElements(".//SignatureMethod") {
		if !slices.Contains(allowedSignatureMethods, method.SelectAttrValue("Algorithm", "")) {
			return false
		}
	}

	for _, digest := range signature.FindElements(".//DigestMethod") {
		if !slices.Contains(allowedDigestMethods, digest.SelectAttrValue("Algorithm", "")) {
			return false
		}
	}

	return len(signature.FindElements(".//SignatureMethod")) > 0
}
