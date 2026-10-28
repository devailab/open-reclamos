package config

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"openreclamos.com/api/internal/shared/constants"
)

type Config struct {
	AppName                 string
	HTTPAddr                string
	PublicBaseURL           string
	AllowPublicRegistration bool
	DatabaseDriver          string
	DatabaseURL             string
	SQLitePath              string
	StorageDriver           string
	StorageLocalDir         string
	S3Endpoint              string
	S3Region                string
	S3Bucket                string
	S3AccessKey             string
	S3SecretKey             string
	SMTPEnabled             bool
	SMTPHost                string
	SMTPPort                string
	SMTPUser                string
	SMTPPassword            string
	SMTPFrom                string
	SMTPTLSMode             string
	TurnstileEnabled        bool
	TurnstileSiteKey        string
	TurnstileSecretKey      string
	DocumentLookupProvider  string
	DocumentLookupToken     string
	JWTAccessSecret         string
	JWTRefreshSecret        string
	JWTKeyFile              string
	SSOEncryptionKey        string
	WebhookEncryptionKey    string
	WorkersEnabled          bool
	AllowedOrigins          []string
	SSOAllowedHosts         []string
}

func (c Config) DocumentLookupEnabled() bool {
	if strings.TrimSpace(c.DocumentLookupToken) == "" {
		return false
	}

	switch strings.ToLower(strings.TrimSpace(c.DocumentLookupProvider)) {
	case "json_pe", "json.pe", "api_peru_dev", "apiperudev":
		return true

	default:
		return false
	}
}

// El entorno del proceso prevalece sobre el archivo, sin modificar os.Environ.
func Load(envFile string, explicit bool) (Config, error) {
	values, err := godotenv.Read(envFile)
	if err != nil && (explicit || !os.IsNotExist(err)) {
		return Config{}, errors.New(constants.CfgEnvFileFailed)
	}

	cfg, err := parse(func(key string) string {
		if value, ok := os.LookupEnv(key); ok {
			return value
		}

		return values[key]
	})
	if err != nil {
		return Config{}, err
	}

	if err = cfg.loadJWTKeys(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func parse(get func(string) string) (Config, error) {
	defaultValue := func(key, fallback string) string {
		if value := strings.TrimSpace(get(key)); value != "" {
			return value
		}

		return fallback
	}

	cfg := Config{
		AppName:                defaultValue("APP_NAME", "Open Reclamos"),
		HTTPAddr:               defaultValue("HTTP_ADDR", "127.0.0.1:8080"),
		PublicBaseURL:          defaultValue("PUBLIC_BASE_URL", "http://localhost:8080"),
		DatabaseDriver:         strings.ToLower(strings.TrimSpace(get("DATABASE_DRIVER"))),
		DatabaseURL:            strings.TrimSpace(get("DATABASE_URL")),
		SQLitePath:             defaultValue("SQLITE_PATH", "./data/open-reclamos.db"),
		StorageDriver:          defaultValue("STORAGE_DRIVER", "local"),
		StorageLocalDir:        defaultValue("STORAGE_LOCAL_DIR", "./data/files"),
		S3Endpoint:             get("S3_ENDPOINT"),
		S3Region:               defaultValue("S3_REGION", "us-east-1"),
		S3Bucket:               get("S3_BUCKET"),
		S3AccessKey:            get("S3_ACCESS_KEY_ID"),
		S3SecretKey:            get("S3_SECRET_ACCESS_KEY"),
		SMTPHost:               get("SMTP_HOST"),
		SMTPPort:               defaultValue("SMTP_PORT", "587"),
		SMTPUser:               get("SMTP_USER"),
		SMTPPassword:           get("SMTP_PASSWORD"),
		SMTPFrom:               get("SMTP_FROM"),
		SMTPTLSMode:            defaultValue("SMTP_TLS_MODE", "starttls"),
		TurnstileSiteKey:       get("TURNSTILE_SITE_KEY"),
		TurnstileSecretKey:     get("TURNSTILE_SECRET_KEY"),
		DocumentLookupProvider: defaultValue("DOCUMENT_LOOKUP_PROVIDER", "none"),
		DocumentLookupToken:    get("DOCUMENT_LOOKUP_TOKEN"),
		JWTAccessSecret:        get("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:       get("JWT_REFRESH_SECRET"),
		JWTKeyFile:             defaultValue("JWT_KEY_FILE", "./data/jwt-keys.json"),
		SSOEncryptionKey:       get("SSO_ENCRYPTION_KEY"),
		WebhookEncryptionKey:   get("WEBHOOK_ENCRYPTION_KEY"),
	}

	if _, _, err := net.SplitHostPort(cfg.HTTPAddr); err != nil {
		return Config{}, errors.New(constants.CfgInvalidHTTPAddr)
	}

	base, err := url.Parse(cfg.PublicBaseURL)
	if err != nil || base.Host == "" || (base.Scheme != "http" && base.Scheme != "https") || base.User != nil ||
		base.RawQuery != "" ||
		base.Fragment != "" ||
		(base.Path != "" && base.Path != "/") {
		return Config{}, errors.New(constants.CfgInvalidPublicBaseURL)
	}

	cfg.PublicBaseURL = strings.TrimRight(cfg.PublicBaseURL, "/")
	cfg.AllowPublicRegistration, err = strconv.ParseBool(defaultValue("ALLOW_PUBLIC_REGISTRATION", "false"))
	if err != nil {
		return Config{}, errors.New(constants.CfgInvalidPublicSignup)
	}

	for key, destination := range map[string]*bool{"SMTP_ENABLED": &cfg.SMTPEnabled, "TURNSTILE_ENABLED": &cfg.TurnstileEnabled, "WORKERS_ENABLED": &cfg.WorkersEnabled} {
		fallback := "false"

		if key == "WORKERS_ENABLED" {
			fallback = "true"
		}

		*destination, err = strconv.ParseBool(defaultValue(key, fallback))
		if err != nil {
			return Config{}, fmt.Errorf(constants.CfgInvalidBoolean, key)
		}
	}

	if cfg.SMTPEnabled && (cfg.SMTPHost == "" || cfg.SMTPFrom == "") {
		return Config{}, errors.New(constants.CfgSMTPRequired)
	}

	if cfg.SMTPEnabled && cfg.SMTPTLSMode != "tls" && cfg.SMTPTLSMode != "starttls" && cfg.SMTPTLSMode != "none" {
		return Config{}, errors.New(constants.CfgInvalidSMTPTLSMode)
	}

	if cfg.TurnstileEnabled && (cfg.TurnstileSiteKey == "" || cfg.TurnstileSecretKey == "") {
		return Config{}, errors.New(constants.CfgTurnstileKeysMissing)
	}

	if cfg.StorageDriver != "local" && cfg.StorageDriver != "s3" {
		return Config{}, errors.New(constants.CfgInvalidStorageDriver)
	}

	if cfg.StorageDriver == "s3" &&
		(cfg.S3Endpoint == "" || cfg.S3Bucket == "" || cfg.S3AccessKey == "" || cfg.S3SecretKey == "") {
		return Config{}, errors.New(constants.CfgS3CredentialsMissing)
	}

	if cfg.StorageDriver == "s3" {
		endpoint, err := url.Parse(cfg.S3Endpoint)
		if err != nil || endpoint.Host == "" || endpoint.User != nil ||
			(endpoint.Scheme != "http" && endpoint.Scheme != "https") ||
			(endpoint.Path != "" && endpoint.Path != "/") ||
			endpoint.RawQuery != "" ||
			endpoint.Fragment != "" {
			return Config{}, errors.New(constants.CfgInvalidS3Endpoint)
		}
	}

	cfg.AllowedOrigins = []string{cfg.PublicBaseURL}

	for _, host := range strings.Split(get("SSO_ALLOWED_HOSTS"), ",") {
		if strings.TrimSpace(host) != "" {
			cfg.SSOAllowedHosts = append(cfg.SSOAllowedHosts, strings.TrimSpace(host))
		}
	}

	for _, origin := range strings.Split(get("ALLOWED_ORIGINS"), ",") {
		if strings.TrimSpace(origin) != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, strings.TrimSpace(origin))
		}
	}

	if base.Hostname() == "localhost" || base.Hostname() == "127.0.0.1" {
		cfg.AllowedOrigins = append(cfg.AllowedOrigins, "http://localhost:5173", "http://127.0.0.1:5173")
	}

	if cfg.DatabaseURL == "" {
		keys := []string{"DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"}
		configured := false

		for _, key := range keys {
			configured = configured || get(key) != ""
		}

		if configured {
			for _, key := range keys {
				if get(key) == "" {
					return Config{}, fmt.Errorf(constants.CfgMissingValue, key)
				}
			}

			dbURL := url.URL{
				Scheme: "postgresql",
				User:   url.UserPassword(get("DB_USER"), get("DB_PASSWORD")),
				Host:   net.JoinHostPort(get("DB_HOST"), defaultValue("DB_PORT", "5432")),
				Path:   "/" + get("DB_NAME"),
			}

			query := url.Values{"sslmode": {defaultValue("DB_SSLMODE", "require")}}
			dbURL.RawQuery = query.Encode()
			cfg.DatabaseURL = dbURL.String()
		}
	}

	// Sin datos de PostgreSQL, el binario funciona solo con un archivo SQLite local.
	if cfg.DatabaseDriver == "" {
		cfg.DatabaseDriver = "sqlite"

		if cfg.DatabaseURL != "" {
			cfg.DatabaseDriver = "postgres"
		}
	}

	if cfg.DatabaseDriver != "sqlite" && cfg.DatabaseDriver != "postgres" {
		return Config{}, errors.New(constants.CfgInvalidDatabaseDriver)
	}

	if cfg.DatabaseDriver == "postgres" && cfg.DatabaseURL == "" {
		return Config{}, errors.New(constants.CfgPostgresURLRequired)
	}

	return cfg, nil
}
