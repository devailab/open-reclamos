package app

import (
	"bytes"
	"compress/flate"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/crewjam/saml"
	"github.com/go-jose/go-jose/v4"
	"github.com/google/uuid"
	dsig "github.com/russellhaering/goxmldsig"
	"gorm.io/gorm"
	identityutils "openreclamos.com/api/internal/modules/identity/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// prepara la app con un usuario administrador para las pruebas
func ssoTestService(t *testing.T, db *gorm.DB) (*App, auth.Principal, http.Header) {
	t.Helper()

	ctx := context.Background()

	s := New(
		db,
		config.Config{
			AllowPublicRegistration: true,
			PublicBaseURL:           "https://app.example.com",
			SSOEncryptionKey:        base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{3}, 32)),
		},
	)

	suffix := uuid.NewString()[:8]

	registered, err := s.Identity.Session.CreateAccount(
		ctx,
		operation.Input{
			Data: map[string]any{
				"name": "Admin SSO", "last_name": "Prueba",
				"email":         "sso-" + suffix + "@example.com",
				"password":      "Sso-seguro-contraseña-2026",
				"document_type": "PASAPORTE", "document_number": suffix,
			},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	header := accessTokenHeader(registered)
	p, err := s.Auth.Authenticate(ctx, header)
	if err != nil {
		t.Fatal(err)
	}

	ubigeos, err := s.Repo.SearchUbigeos(ctx, "LIMA")
	if err != nil {
		t.Fatal(err)
	}

	tax := "22"

	for _, c := range suffix {
		tax += fmt.Sprint(int(c) % 10)
	}

	tax += "1"

	organization, err := s.Organizations.Organizations.Create(
		ctx,
		p,
		operation.Input{
			Data: map[string]any{
				"name":         "SSO",
				"legal_name":   "SSO SAC",
				"tax_id":       tax,
				"slug":         "sso-" + suffix,
				"ubigeo_id":    ubigeos[0].ID,
				"address_type": "CALLE",
				"address":      "Lima",
			},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	header = accessTokenHeader(organization)
	p, err = s.Auth.Authenticate(ctx, header)
	if err != nil {
		t.Fatal(err)
	}

	p, err = s.Auth.Tenant(ctx, p, utils.PublicData(organization.Data)["id"].(string))
	if err != nil {
		t.Fatal(err)
	}

	return s, p, header
}

// prueba el login con oidc usando un servidor falso
func TestOIDCLoginAndTenantPolicy(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, header := ssoTestService(t, db)
		// clave para firmar los tokens del servidor falso
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			t.Fatal(err)
		}

		signer, err := jose.NewSigner(
			jose.SigningKey{Algorithm: jose.RS256, Key: key},
			(&jose.SignerOptions{}).WithType("JWT").WithHeader("kid", "test-key"),
		)
		if err != nil {
			t.Fatal(err)
		}

		var issuer string
		var lock sync.Mutex
		type authorizationCode struct{ Nonce, Challenge string }
		codes := map[string]authorizationCode{}

		// servidor falso de login: da sus claves y cambia el código por un token
		idp := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")

			switch r.URL.Path {
			case "/.well-known/openid-configuration":
				json.NewEncoder(w).
					Encode(map[string]any{"issuer": issuer, "authorization_endpoint": issuer + "/authorize", "token_endpoint": issuer + "/token", "jwks_uri": issuer + "/keys", "response_types_supported": []string{"code"}, "subject_types_supported": []string{"public"}, "id_token_signing_alg_values_supported": []string{"RS256"}})

			case "/keys":
				json.NewEncoder(w).
					Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{Key: &key.PublicKey, KeyID: "test-key", Algorithm: "RS256", Use: "sig"}}})

			// el código se usa una sola vez y tiene que coincidir con pkce
			case "/token":
				r.ParseForm()
				lock.Lock()

				authorization := codes[r.Form.Get("code")]

				delete(codes, r.Form.Get("code"))
				lock.Unlock()

				nonce := authorization.Nonce
				digest := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
				if nonce == "" || authorization.Challenge != base64.RawURLEncoding.EncodeToString(digest[:]) {
					http.Error(w, "invalid code or PKCE", 400)

					return
				}

				claims := map[string]any{
					"iss":   issuer,
					"sub":   "employee-1",
					"aud":   "client-1",
					"exp":   time.Now().Add(time.Hour).Unix(),
					"iat":   time.Now().Unix(),
					"nonce": nonce,
					// el correo es distinto a propósito: la cuenta no se une por correo
					"email": "not-the-local-email@example.com",
				}

				signed, _ := signer.Sign(utils.JSONBytes(claims))
				raw, _ := signed.CompactSerialize()

				json.NewEncoder(w).
					Encode(map[string]any{"access_token": "unused", "token_type": "Bearer", "id_token": raw})

			default:
				http.NotFound(w, r)
			}
		}))
		defer idp.Close()

		issuer = idp.URL
		s.HTTP.SSO = idp.Client()

		configured, err := s.Identity.SSO.SaveConnection(
			context.Background(),
			p,
			operation.Input{
				Data: map[string]any{
					"name":          "OIDC",
					"protocol":      "oidc",
					"issuer_url":    issuer,
					"client_id":     "client-1",
					"client_secret": "client-secret",
				},
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		id := utils.PublicData(configured.Data)["id"].(string)
		connection, err := s.Repo.GetSSOConnection(context.Background(), id)
		if err != nil {
			t.Fatal(err)
		}

		// hace el inicio y el regreso del login; con badNonce manda un nonce malo
		flow := func(purpose string, badNonce bool) (*httptest.ResponseRecorder, string) {
			t.Helper()

			connection, err := s.Repo.GetSSOConnection(context.Background(), id)
			if err != nil {
				t.Fatal(err)
			}

			request := httptest.NewRequest(
				http.MethodGet,
				s.Config.PublicBaseURL+"/auth/sso/"+id+"/start?purpose="+purpose,
				nil,
			)

			request.Header = header.Clone()

			if purpose != "login" {
				request.Method = http.MethodPost
			}

			start := httptest.NewRecorder()

			if err := s.Identity.SSO.Start(start, request, connection); err != nil {
				t.Fatal(err)
			}

			startURL := start.Header().Get("Location")

			if request.Method == http.MethodPost {
				var payload map[string]string

				if err := json.Unmarshal(start.Body.Bytes(), &payload); err != nil {
					t.Fatal(err)
				}

				startURL = payload["url"]
			}

			location, _ := url.Parse(startURL)
			nonce := location.Query().Get("nonce")

			if badNonce {
				nonce = "incorrecto"
			}

			code := uuid.NewString()

			lock.Lock()

			codes[code] = authorizationCode{Nonce: nonce, Challenge: location.Query().Get("code_challenge")}

			lock.Unlock()

			callback := httptest.NewRequest(
				http.MethodGet,
				s.Config.PublicBaseURL+"/auth/sso/"+id+"/oidc/callback?code="+code+"&state="+location.Query().
					Get("state"),
				nil,
			)

			callback.AddCookie(start.Result().Cookies()[0])

			result := httptest.NewRecorder()
			err = s.Identity.SSO.Callback(result, callback, connection, "oidc/callback")

			if badNonce {
				if err == nil {
					t.Fatal("se aceptó un nonce incorrecto")
				}
			} else if err != nil {
				t.Fatal(err)
			}

			return result, location.Query().Get("state")
		}

		// el nonce malo debe fallar; el bueno marca la conexión como probada
		flow("test", true)
		flow("test", false)

		connection, err = s.Repo.GetSSOConnection(context.Background(), id)
		if err != nil {
			t.Fatal(err)
		}

		if connection.TestedVersion == nil {
			t.Fatal("no se persistió el test exitoso")
		}

		_, err = s.Identity.SSO.UpdatePolicy(
			context.Background(),
			p,
			operation.Input{Data: map[string]any{"login_mode": "sso_required", "connection_id": id}},
		)
		if err != nil {
			t.Fatal(err)
		}

		if _, err = s.Auth.Tenant(context.Background(), p, p.OrganizationID); err == nil {
			t.Fatal("una sesión local eludió SSO obligatorio")
		}

		// hace login por sso y pide un access nuevo con el refresh
		login, _ := flow("login", false)

		loginTokens, err := s.Call(
			context.Background(),
			"RefreshToken",
			operation.Input{},
			tokenCookieHeader(login.Header(), "open_reclamos_refresh"),
		)
		if err != nil {
			t.Fatal(err)
		}

		ssoHeader := accessTokenHeader(loginTokens)
		logged, err := s.Auth.Authenticate(context.Background(), ssoHeader)
		if err != nil {
			t.Fatal(err)
		}

		if logged.AuthMethod != "oidc" || logged.UserID != p.UserID {
			t.Fatal("identidad local vinculada incorrectamente")
		}

		if _, err = s.Auth.Tenant(context.Background(), logged, p.OrganizationID); err != nil {
			t.Fatal(err)
		}

		// después del refresh debe seguir entrando a la empresa
		refreshed, err := s.Call(
			context.Background(),
			"RefreshToken",
			operation.Input{},
			tokenCookieHeader(login.Header(), "open_reclamos_refresh"),
		)
		if err != nil {
			t.Fatal("refresh OIDC falló", err)
		}

		logged, err = s.Auth.Authenticate(context.Background(), accessTokenHeader(refreshed))
		if err != nil {
			t.Fatal(err)
		}

		if _, err = s.Auth.Tenant(context.Background(), logged, p.OrganizationID); err != nil {
			t.Fatal("refresh perdió grant OIDC", err)
		}

		if err = auth.MustLocal(logged); err == nil {
			t.Fatal("SSO tenant concedió autoridad global local")
		}
	})
}

// prueba el login con saml; la misma respuesta no se puede usar dos veces
func TestSAMLLoginAndReplayProtection(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, principal, header := ssoTestService(t, db)
		// certificado y clave del servidor falso
		certificatePEM, privatePEM, err := identityutils.NewSPKey("idp")
		if err != nil {
			t.Fatal(err)
		}

		certificateBlock, _ := pem.Decode([]byte(certificatePEM))
		keyBlock, _ := pem.Decode([]byte(privatePEM))
		certificate, err := x509.ParseCertificate(certificateBlock.Bytes)
		if err != nil {
			t.Fatal(err)
		}

		key, err := x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
		if err != nil {
			t.Fatal(err)
		}

		metadataURL, _ := url.Parse("https://idp.example.com/metadata")
		ssoURL, _ := url.Parse("https://idp.example.com/sso")

		idp := &saml.IdentityProvider{
			Key:             key,
			Signer:          key,
			Certificate:     certificate,
			MetadataURL:     *metadataURL,
			SSOURL:          *ssoURL,
			SignatureMethod: dsig.RSASHA256SignatureMethod,
		}

		metadata, err := xml.Marshal(idp.Metadata())
		if err != nil {
			t.Fatal(err)
		}

		configured, err := s.Identity.SSO.SaveConnection(
			context.Background(),
			principal,
			operation.Input{
				Data: map[string]any{"name": "SAML", "protocol": "saml", "idp_metadata_xml": string(metadata)},
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		id := utils.PublicData(configured.Data)["id"].(string)
		// la app no acepta logins que empiecen en el servidor y firma con sha256
		provider, err := s.Identity.SSO.ServiceProvider(context.Background(), id)
		if err != nil {
			t.Fatal(err)
		}

		if provider.AllowIDPInitiated || !strings.Contains(provider.SignatureMethod, "sha256") {
			t.Fatal("configuración criptográfica incorrecta")
		}

		connection, err := s.Repo.GetSSOConnection(context.Background(), id)
		if err != nil {
			t.Fatal(err)
		}

		// hace el inicio, la respuesta firmada y el regreso del login
		flow := func(purpose string) *httptest.ResponseRecorder {
			t.Helper()

			connection, err := s.Repo.GetSSOConnection(context.Background(), id)
			if err != nil {
				t.Fatal(err)
			}

			startRequest := httptest.NewRequest(
				http.MethodGet,
				s.Config.PublicBaseURL+"/auth/sso/"+id+"/start?purpose="+purpose,
				nil,
			)

			startRequest.Header = header.Clone()

			if purpose != "login" {
				startRequest.Method = http.MethodPost
			}

			start := httptest.NewRecorder()

			if err := s.Identity.SSO.Start(start, startRequest, connection); err != nil {
				t.Fatal(err)
			}

			startURL := start.Header().Get("Location")

			if startRequest.Method == http.MethodPost {
				var payload map[string]string

				if err := json.Unmarshal(start.Body.Bytes(), &payload); err != nil {
					t.Fatal(err)
				}

				startURL = payload["url"]
			}

			redirect, _ := url.Parse(startURL)
			compressed, err := base64.StdEncoding.DecodeString(redirect.Query().Get("SAMLRequest"))
			if err != nil {
				t.Fatal(err)
			}

			// la petición saml viaja comprimida en la url
			reader := flate.NewReader(bytes.NewReader(compressed))
			requestXML, err := io.ReadAll(reader)

			reader.Close()

			if err != nil {
				t.Fatal(err)
			}

			var authnRequest saml.AuthnRequest

			if err = xml.Unmarshal(requestXML, &authnRequest); err != nil {
				t.Fatal(err)
			}

			spMetadata := provider.Metadata()
			descriptor := &spMetadata.SPSSODescriptors[0]

			idpRequest := &saml.IdpAuthnRequest{
				IDP: idp, Request: authnRequest, Now: time.Now(), ServiceProviderMetadata: spMetadata,
				SPSSODescriptor: descriptor, ACSEndpoint: &descriptor.AssertionConsumerServices[0],
				RelayState:  redirect.Query().Get("RelayState"),
				HTTPRequest: httptest.NewRequest(http.MethodGet, redirect.String(), nil),
			}

			if err = (saml.DefaultAssertionMaker{}).MakeAssertion(idpRequest, &saml.Session{
				NameID: "employee-saml", NameIDFormat: string(saml.PersistentNameIDFormat), UserName: "Empleado",
				CreateTime: time.Now(), ExpireTime: time.Now().Add(time.Hour),
			}); err != nil {
				t.Fatal(err)
			}

			if err = idpRequest.MakeResponse(); err != nil {
				t.Fatal(err)
			}

			form, err := idpRequest.PostBinding()
			if err != nil {
				t.Fatal(err)
			}

			// la cookie tiene que ser segura para que no se pierda al volver
			cookie := start.Result().Cookies()[0]
			if cookie.SameSite != http.SameSiteNoneMode || !cookie.Secure {
				t.Fatal("cookie SAML incorrecta")
			}

			values := url.Values{"SAMLResponse": {form.SAMLResponse}, "RelayState": {form.RelayState}}

			callback := httptest.NewRequest(
				http.MethodPost,
				provider.AcsURL.String(),
				strings.NewReader(values.Encode()),
			)

			callback.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			callback.AddCookie(cookie)

			result := httptest.NewRecorder()

			if err = s.Identity.SSO.Callback(result, callback, connection, "saml/acs"); err != nil {
				t.Fatal(err)
			}

			// mandar la misma respuesta otra vez tiene que fallar
			replay := httptest.NewRequest(http.MethodPost, provider.AcsURL.String(), strings.NewReader(values.Encode()))

			replay.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			replay.AddCookie(cookie)

			if err = s.Identity.SSO.Callback(httptest.NewRecorder(), replay, connection, "saml/acs"); err == nil {
				t.Fatal("se aceptó replay SAML")
			}

			return result
		}

		flow("test")

		connection, err = s.Repo.GetSSOConnection(context.Background(), id)
		if err != nil {
			t.Fatal(err)
		}

		if connection.TestedVersion == nil {
			t.Fatal("No se persistió la validación SAML.")
		}

		_, err = s.Identity.SSO.UpdatePolicy(
			context.Background(),
			principal,
			operation.Input{Data: map[string]any{"login_mode": "sso_required", "connection_id": id}},
		)
		if err != nil {
			t.Fatal(err)
		}

		// con sso obligatorio, el login debe crear una sesión válida
		login := flow("login")

		loginTokens, err := s.Call(
			context.Background(),
			"RefreshToken",
			operation.Input{},
			tokenCookieHeader(login.Header(), "open_reclamos_refresh"),
		)
		if err != nil {
			t.Fatal(err)
		}

		ssoHeader := accessTokenHeader(loginTokens)
		logged, err := s.Auth.Authenticate(context.Background(), ssoHeader)
		if err != nil {
			t.Fatal(err)
		}

		if logged.AuthMethod != "saml" || logged.UserID != principal.UserID {
			t.Fatal("sesión SAML incorrecta")
		}

		if _, err = s.Auth.Tenant(context.Background(), logged, principal.OrganizationID); err != nil {
			t.Fatal(err)
		}
	})
}
