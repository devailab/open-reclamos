package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Acotar la memoria de Argon2 incluso cuando llegan varias peticiones simultáneas.
var passwordSlots = make(chan struct{}, 2)

// HashPassword deriva un hash Argon2id con sal aleatoria.
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)

	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	passwordSlots <- struct{}{}
	defer func() { <-passwordSlots }()

	key := argon2.IDKey([]byte(password), salt, 2, 64*1024, 1, 32)

	return fmt.Sprintf(
		"$argon2id$v=19$m=65536,t=2,p=1$%s$%s",
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// CheckPassword compara en tiempo constante una contraseña con su hash.
func CheckPassword(encoded, password string) bool {
	parts := strings.Split(encoded, "$")
	if len(password) > 256 || len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" ||
		parts[3] != "m=65536,t=2,p=1" {
		return false
	}

	salt, e := base64.RawStdEncoding.DecodeString(parts[4])
	if e != nil {
		return false
	}

	expected, e := base64.RawStdEncoding.DecodeString(parts[5])
	if e != nil || len(expected) != 32 || len(salt) != 16 {
		return false
	}

	passwordSlots <- struct{}{}
	defer func() { <-passwordSlots }()

	key := argon2.IDKey([]byte(password), salt, 2, 64*1024, 1, 32)

	return subtle.ConstantTimeCompare(key, expected) == 1
}
