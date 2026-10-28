package app

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func tokenCookieHeader(header http.Header, name string) http.Header {
	response := http.Response{Header: header}

	for _, cookie := range response.Cookies() {
		if cookie.Name == name {
			return http.Header{"Cookie": []string{cookie.String()}}
		}
	}

	return nil
}

func accessTokenHeader(out operation.Output) http.Header {
	return http.Header{"Authorization": []string{"Bearer " + out.AccessToken}}
}

func TestAccessIsReturnedInPayloadAndNotStoredInCookie(t *testing.T) {
	s := New(nil, configForWorkerTest(t))
	_, raw, err := s.Auth.NewContext(utils.NewID(), "local")
	if err != nil {
		t.Fatal(err)
	}

	out, err := operation.Login(s.Auth, raw, map[string]string{"id": "test"})
	if err != nil {
		t.Fatal(err)
	}

	claims, err := s.Auth.Parse(out.AccessToken, "access")
	if err != nil || out.AccessExpiresAt != claims.ExpiresAt.Unix() {
		t.Fatal("access ausente de respuesta", err)
	}

	response := http.Response{Header: out.Header}

	for _, cookie := range response.Cookies() {
		if cookie.Value != "" && cookie.Name != "open_reclamos_refresh" {
			t.Fatal("se almacenó access en cookie", cookie.Name)
		}
	}

	if _, err = s.Auth.Authenticate(context.Background(), http.Header{"Cookie": []string{"open_reclamos_access=" + out.AccessToken}}); connect.CodeOf(
		err,
	) != connect.CodeUnauthenticated {
		t.Fatal("se aceptó access por cookie", err)
	}

	if _, err = s.Auth.Authenticate(context.Background(), tokenCookieHeader(out.Header, "open_reclamos_refresh")); connect.CodeOf(
		err,
	) != connect.CodeUnauthenticated {
		t.Fatal("se usó refresh como autenticación ordinaria", err)
	}
}

func TestJWTOrganizationCreationAndRefreshAfterTwoHours(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, _ := ssoTestService(t, db)
		ctx := context.Background()
		s.Config.AllowPublicRegistration = false
		p.Session.AuthenticatedAt = time.Now().Add(-2 * time.Hour)
		p.Session.ExpiresAt = p.Session.AuthenticatedAt.Add(auth.LoginLifetime)
		claims := s.Auth.ContextClaims(p)
		issued, err := operation.Session(s.Auth, claims, nil)
		if err != nil {
			t.Fatal(err)
		}

		accessHeader := accessTokenHeader(issued)

		if _, err = s.Auth.Authenticate(ctx, accessHeader); err != nil {
			t.Fatal(err)
		}

		districts, err := s.Repo.SearchUbigeos(ctx, "LIMA")
		if err != nil {
			t.Fatal(err)
		}

		suffix := strings.ReplaceAll(utils.NewID(), "-", "")
		tax := "24"

		for _, r := range suffix[len(suffix)-9:] {
			tax += string('0' + r%10)
		}

		created, err := s.Call(
			ctx,
			"CreateOrganization",
			operation.Input{
				Data: map[string]any{
					"name":         "JWT",
					"legal_name":   "JWT SAC",
					"tax_id":       tax,
					"slug":         "jwt-" + suffix,
					"ubigeo_id":    districts[0].ID,
					"address_type": "CALLE",
					"address":      "Prueba 123",
				},
			},
			accessHeader,
		)
		if err != nil {
			t.Fatal("admin local no pudo crear tras dos horas", err)
		}

		organizationID := utils.PublicData(created.Data)["id"].(string)

		refreshed, err := s.Call(
			ctx,
			"RefreshToken",
			operation.Input{},
			tokenCookieHeader(created.Header, "open_reclamos_refresh"),
		)
		if err != nil {
			t.Fatal(err)
		}

		current, err := s.Auth.Authenticate(ctx, accessTokenHeader(refreshed))
		if err != nil {
			t.Fatal(err)
		}

		if current.OrganizationID != organizationID || current.Session.AuthenticatedAt.Unix() != claims.AuthTime ||
			current.Session.ExpiresAt.Unix() != claims.LoginExpires {
			t.Fatal("refresh perdió empresa o extendió el login")
		}

		switched, err := s.Call(
			ctx,
			"SwitchOrganization",
			operation.Input{ID: p.OrganizationID},
			accessTokenHeader(refreshed),
		)
		if err != nil {
			t.Fatal(err)
		}

		afterSwitch, err := s.Call(
			ctx,
			"RefreshToken",
			operation.Input{},
			tokenCookieHeader(switched.Header, "open_reclamos_refresh"),
		)
		if err != nil {
			t.Fatal(err)
		}

		current, err = s.Auth.Authenticate(ctx, accessTokenHeader(afterSwitch))
		if err != nil || current.OrganizationID != p.OrganizationID {
			t.Fatal("refresh restauró empresa anterior", err)
		}

		if _, err = s.Call(ctx, "RefreshToken", operation.Input{Data: map[string]any{"refresh_token": "client"}}, nil); connect.CodeOf(
			err,
		) != connect.CodeUnauthenticated {
			t.Fatal("refresh aceptó token del body", err)
		}

		var count int64

		if err = db.Table("sessions").Where("user_id = ?", p.UserID).Count(&count).Error; err != nil ||
			count != 0 {
			t.Fatal("JWT escribió sesiones opacas", count, err)
		}
	})
}
