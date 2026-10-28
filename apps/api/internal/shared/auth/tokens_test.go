package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/utils"
)

func TestJWTKindsExpirationAndTampering(t *testing.T) {
	cfg := config.Config{}
	s := NewService(nil, &cfg)
	_, raw, err := s.NewContext(utils.NewID(), "local")
	if err != nil {
		t.Fatal(err)
	}

	claims, err := s.Parse(raw, "access")
	if err != nil {
		t.Fatal(err)
	}

	if delta := claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time); delta != AccessLifetime {
		t.Fatal("access no tiene duración corta", delta)
	}

	refresh, err := s.Sign(claims, "refresh")
	if err != nil {
		t.Fatal(err)
	}

	r, err := s.Parse(refresh, "refresh")
	if err != nil {
		t.Fatal(err)
	}

	if r.ExpiresAt.Unix() != claims.LoginExpires {
		t.Fatal("refresh no conserva el plazo del login")
	}

	for _, test := range []struct{ raw, kind string }{{raw, "refresh"}, {refresh, "access"}, {raw[:len(raw)-10] + "AAAAAAAAAA", "access"}} {
		if _, err = s.Parse(test.raw, test.kind); err == nil {
			t.Fatal("token inválido aceptado")
		}
	}

	key, _ := s.tokenKey("access")

	for _, mode := range []string{"expired", "issuer", "audience", "missing-exp"} {
		invalidClaims := claims

		switch mode {
		case "expired":
			invalidClaims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute))

		case "issuer":
			invalidClaims.Issuer = "other"

		case "audience":
			invalidClaims.Audience = jwt.ClaimStrings{"other"}

		case "missing-exp":
			invalidClaims.ExpiresAt = nil
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, invalidClaims)
		token.Header["typ"] = "open-reclamos-access+jwt"
		invalidRaw, _ := token.SignedString(key)

		if _, err = s.Parse(invalidRaw, "access"); err == nil {
			t.Fatal("validación JWT omitida", mode)
		}
	}
}
