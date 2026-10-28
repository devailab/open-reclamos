package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestLimiterIsBoundedAndReclaimsExpiredEntries(t *testing.T) {
	now := time.Now()
	limiter := rateLimiter{entries: map[string]rateEntry{}, capacity: 2}
	if !limiter.allow("a", 1, now) || limiter.allow("a", 1, now) {
		t.Fatal("no se respetó el límite")
	}

	if !limiter.allow("b", 1, now) || limiter.allow("c", 1, now) || len(limiter.entries) != 2 {
		t.Fatal("la caché excedió su capacidad")
	}

	if !limiter.allow("c", 1, now.Add(time.Minute)) || len(limiter.entries) != 1 {
		t.Fatal("no se liberaron entradas vencidas")
	}
}

func TestSensitiveRoutesDoNotConsumeDashboardQuota(t *testing.T) {
	handler := Security(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }), nil)

	request := func(path string) int {
		response := httptest.NewRecorder()

		handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, path, nil))

		return response.Code
	}

	for i := 0; i < 10; i++ {
		if request("/rpc/openreclamos.backend.v1.BackendService/Login") != 200 {
			t.Fatal("login limitado antes de tiempo")
		}
	}

	if request("/rpc/openreclamos.backend.v1.BackendService/Login") != 429 {
		t.Fatal("login no limitado")
	}

	if request("/rpc/openreclamos.backend.v1.BackendService/GetDashboard") != 200 {
		t.Fatal("el login agotó el cupo del dashboard")
	}
}

func TestCORSOriginsAndWildcard(t *testing.T) {
	for _, test := range []struct {
		name    string
		origins []string
		origin  string
		method  string
		status  int
	}{
		{"explicit_allowed", []string{"https://web.example.com"}, "https://web.example.com", http.MethodGet, 200},
		{"explicit_rejected", []string{"https://web.example.com"}, "https://other.example.com", http.MethodGet, 403},
		{"wildcard_get", []string{"*"}, "https://other.example.com", http.MethodGet, 200},
		{"wildcard_post", []string{"*"}, "http://localhost:5174", http.MethodPost, 200},
		{"wildcard_preflight", []string{"*"}, "https://other.example.com", http.MethodOptions, 204},
		{"mixed_wildcard", []string{"https://web.example.com", "*"}, "https://other.example.com", http.MethodGet, 200},
		{"no_origin", []string{"*"}, "", http.MethodGet, 200},
	} {
		t.Run(test.name, func(t *testing.T) {
			called := false

			handler := Security(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(200) }),
				test.origins,
			)

			request := httptest.NewRequest(test.method, "/rpc/example", nil)

			if test.origin != "" {
				request.Header.Set("Origin", test.origin)
			}

			response := httptest.NewRecorder()

			response.Header().Set("Vary", "Accept-Encoding")
			handler.ServeHTTP(response, request)

			if response.Code != test.status {
				t.Fatalf("status %d, esperado %d", response.Code, test.status)
			}

			allowed := test.origin != "" && test.status < 400
			if allowed {
				if response.Header().Get("Access-Control-Allow-Origin") != test.origin {
					t.Fatal("CORS debe devolver el origen concreto")
				}

				if response.Header().Get("Access-Control-Allow-Credentials") != "true" {
					t.Fatal("faltan credenciales CORS")
				}
			} else if response.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatal("se concedió un origen no autorizado o inexistente")
			}

			vary := strings.Join(response.Header().Values("Vary"), ",")
			if !strings.Contains(vary, "Accept-Encoding") || test.origin != "" && !strings.Contains(vary, "Origin") {
				t.Fatal("Vary incorrecto")
			}

			if called != (test.status == 200) {
				t.Fatal("ejecución del handler incorrecta")
			}

			if test.method == http.MethodOptions &&
				!strings.Contains(response.Header().Get("Access-Control-Allow-Headers"), "Authorization") {
				t.Fatal("preflight no permite Authorization")
			}
		})
	}
}
