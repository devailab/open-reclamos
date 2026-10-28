package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestJWTKeysPersistAcrossRestartWithPrivatePermissions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "private", "jwt-keys.json")
	first := Config{JWTKeyFile: path}

	if err := first.loadJWTKeys(); err != nil {
		t.Fatal(err)
	}

	second := Config{JWTKeyFile: path}

	if err := second.loadJWTKeys(); err != nil {
		t.Fatal(err)
	}

	if first.JWTAccessSecret != second.JWTAccessSecret || first.JWTRefreshSecret != second.JWTRefreshSecret ||
		first.JWTAccessSecret == first.JWTRefreshSecret {
		t.Fatal("claves no persistentes o compartidas entre tipos")
	}

	info, err := os.Stat(path)
	if err != nil || info.Mode().Perm() != 0600 {
		t.Fatal("permisos de claves incorrectos", err)
	}
}

func TestJWTRejectsIncompleteOrEqualSigningKeys(t *testing.T) {
	for _, c := range []Config{{JWTAccessSecret: "short"}, {JWTAccessSecret: "same", JWTRefreshSecret: "same"}} {
		if err := c.loadJWTKeys(); err == nil {
			t.Fatal("claves inválidas aceptadas")
		}
	}
}
