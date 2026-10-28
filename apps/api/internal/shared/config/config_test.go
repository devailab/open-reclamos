package config

import (
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestEnvironmentOverridesFile(t *testing.T) {
	file := filepath.Join(t.TempDir(), ".env")

	if err := os.WriteFile(file, []byte("APP_NAME=Desde archivo\n"), 0600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("APP_NAME", "Desde entorno")
	t.Setenv("JWT_KEY_FILE", filepath.Join(t.TempDir(), "jwt-keys.json"))

	cfg, err := Load(file, true)
	if err != nil || cfg.AppName != "Desde entorno" {
		t.Fatalf("no se respetó la precedencia: %v", err)
	}
}

func TestDatabasePasswordIsEscaped(t *testing.T) {
	values := map[string]string{
		"DB_HOST":     "localhost",
		"DB_USER":     "user",
		"DB_PASSWORD": "p@ss:/?#",
		"DB_NAME":     "open_reclamos",
	}

	cfg, err := parse(func(key string) string { return values[key] })
	if err != nil {
		t.Fatal(err)
	}

	parsed, err := url.Parse(cfg.DatabaseURL)
	if err != nil {
		t.Fatal(err)
	}

	password, _ := parsed.User.Password()
	if password != values["DB_PASSWORD"] {
		t.Fatal("la contraseña se corrompió al construir la URL")
	}
}

func TestExplicitMissingFileFails(t *testing.T) {
	if _, err := Load(filepath.Join(t.TempDir(), "missing.env"), true); err == nil {
		t.Fatal("un archivo explícito inexistente debe producir error")
	}
}

func TestAllowedOriginsPreservesWildcard(t *testing.T) {
	cfg, err := parse(func(key string) string {
		if key == "ALLOWED_ORIGINS" {
			return " https://web.example.com, * "
		}

		return ""
	})
	if err != nil {
		t.Fatal(err)
	}

	if !slices.Contains(cfg.AllowedOrigins, "*") || !slices.Contains(cfg.AllowedOrigins, "https://web.example.com") {
		t.Fatal("no se conservó el wildcard de entorno")
	}
}

func TestInvalidProviderConfigurationFailsAtStartup(t *testing.T) {
	for _, test := range []struct {
		Name   string
		Values map[string]string
	}{
		{"smtp_mode", map[string]string{"SMTP_ENABLED": "true", "SMTP_HOST": "localhost", "SMTP_FROM": "sender@example.com", "SMTP_TLS_MODE": "invalid"}},
		{"s3_scheme", map[string]string{"STORAGE_DRIVER": "s3", "S3_ENDPOINT": "ftp://storage.example.com", "S3_BUCKET": "files", "S3_ACCESS_KEY_ID": "test", "S3_SECRET_ACCESS_KEY": "test"}},
		{"s3_path", map[string]string{"STORAGE_DRIVER": "s3", "S3_ENDPOINT": "https://storage.example.com/path", "S3_BUCKET": "files", "S3_ACCESS_KEY_ID": "test", "S3_SECRET_ACCESS_KEY": "test"}},
	} {
		t.Run(test.Name, func(t *testing.T) {
			if _, err := parse(func(key string) string { return test.Values[key] }); err == nil {
				t.Fatal("configuración inválida aceptada")
			}
		})
	}
}
