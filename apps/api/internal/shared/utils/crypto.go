package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"

	"github.com/google/uuid"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
)

// NewID genera un UUID v7 ordenable por tiempo.
func NewID() string { return uuid.Must(uuid.NewV7()).String() }

// Hash devuelve el SHA-256 hexadecimal; se usa para guardar tokens sin el valor original.
func Hash(v string) string { sum := sha256.Sum256([]byte(v)); return hex.EncodeToString(sum[:]) }

// Token genera un secreto aleatorio de 32 bytes en base64 URL.
func Token() string {
	b := make([]byte, 32)

	if _, err := rand.Read(b); err != nil {
		panic(err)
	}

	return base64.RawURLEncoding.EncodeToString(b)
}

// Encrypt cifra con AES-GCM; context liga el secreto a su registro (por ejemplo, su ID).
func Encrypt(key, context, plain string) (string, error) {
	gcm, err := newGCM(key, constants.MsgInvalidCipherKey)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())

	if _, err = rand.Read(nonce); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(gcm.Seal(nonce, nonce, []byte(plain), []byte(context))), nil
}

// Decrypt descifra un valor creado por Encrypt con la misma clave y contexto.
func Decrypt(key, context, encoded string) (string, error) {
	gcm, err := newGCM(key, constants.MsgInvalidCipherConfig)
	if err != nil {
		return "", err
	}

	payload, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil || len(payload) < gcm.NonceSize() {
		return "", apperrors.Invalid(constants.MsgInvalidCipherText)
	}

	plain, err := gcm.Open(nil, payload[:gcm.NonceSize()], payload[gcm.NonceSize():], []byte(context))

	return string(plain), err
}

func newGCM(key, invalidMessage string) (cipher.AEAD, error) {
	b, err := base64.StdEncoding.DecodeString(key)
	if err != nil || len(b) != 32 {
		return nil, apperrors.Invalid(invalidMessage)
	}

	block, err := aes.NewCipher(b)
	if err != nil {
		return nil, err
	}

	return cipher.NewGCM(block)
}
