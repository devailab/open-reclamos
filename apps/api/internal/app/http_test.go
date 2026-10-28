package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"connectrpc.com/connect"
	systemv1 "openreclamos.com/api/gen/openreclamos/system/v1"
	"openreclamos.com/api/gen/openreclamos/system/v1/systemv1connect"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/server"
)

func TestPublicConfigReportsDocumentLookupWithoutSecrets(t *testing.T) {
	for _, tc := range []struct {
		provider, token string
		enabled         bool
	}{
		{"api_peru_dev", "private-token", true},
		{"json_pe", "private-token", true},
		{"api_peru_dev", "", false},
		{"none", "private-token", false},
		{"unknown", "private-token", false},
	} {
		handler := New(
			nil,
			config.Config{AppName: "Prueba", DocumentLookupProvider: tc.provider, DocumentLookupToken: tc.token},
		).Handler("test")

		response := httptest.NewRecorder()

		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/config", nil))

		var data map[string]any

		if err := json.Unmarshal(response.Body.Bytes(), &data); err != nil {
			t.Fatal(err)
		}

		if response.Code != 200 || data["documentLookupEnabled"] != tc.enabled || len(data) != 2 {
			t.Fatalf("configuración pública incorrecta: %v", data)
		}
	}
}

func TestConnectRoundTripAndReservedRoutes(t *testing.T) {
	server := httptest.NewServer(New(nil, config.Config{AppName: "Prueba"}).Handler("test"))
	defer server.Close()

	client := systemv1connect.NewSystemServiceClient(server.Client(), server.URL+"/rpc")
	response, err := client.Ping(context.Background(), connect.NewRequest(&systemv1.PingRequest{}))
	if err != nil || response.Msg.AppName != "Prueba" {
		t.Fatalf("falló la llamada RPC: %v", err)
	}

	for route, want := range map[string]int{"/health/live": 200, "/health/ready": 503, "/api/missing": 404, "/rpc/missing": 404, "/auth/missing": 404} {
		response, err := server.Client().Get(server.URL + route)
		if err != nil {
			t.Fatal(err)
		}

		response.Body.Close()

		if response.StatusCode != want {
			t.Errorf("%s: status %d, esperado %d", route, response.StatusCode, want)
		}
	}
}

func TestSPAFallbackDoesNotMaskMissingAssets(t *testing.T) {
	handler := server.NewWebHandler(fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("<main>SPA</main>")}})

	for route, want := range map[string]int{
		"/": 200, "/status": 200, "/login": 200, "/login/company": 200, "/register": 200, "/install": 200,
		"/invite/token": 200, "/setup": 200, "/c/company": 200, "/s/store": 200,
		"/dashboard": 200, "/dashboard/complaints/record": 200, "/dashboard/complaints/stores/store": 200,
		"/dashboard/notices/printable": 200, "/dashboard/webhooks/deliveries": 200,
		"/dashboard/platform": 200, "/dashboard/admin-settings": 200,
		"/assets/missing.js": 404, "/fonts/missing.woff2": 404, "/api/missing": 404, "/rpc/missing": 404,
		"/auth/missing": 404, "/mcp/missing": 404, "/unknown": 404, "/dashboard/unknown": 404,
		"/dashboard/complaints/stores/": 404,
	} {
		response := httptest.NewRecorder()

		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, route, nil))

		if response.Code != want {
			t.Errorf("%s: status %d, esperado %d", route, response.Code, want)
		}

		if want == 200 && response.Body.String() != "<main>SPA</main>" {
			t.Errorf("%s: no se sirvió la SPA", route)
		}
	}
}

func TestSPARoutesSupportHeadAndQueryStrings(t *testing.T) {
	handler := server.NewWebHandler(fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("<main>SPA</main>")}})
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/dashboard/complaints?status=open", nil))

	if response.Code != 200 {
		t.Fatal("query string no soportado")
	}

	response = httptest.NewRecorder()

	handler.ServeHTTP(response, httptest.NewRequest(http.MethodHead, "/dashboard/notices/printable", nil))

	if response.Code != 200 || response.Body.Len() != 0 {
		t.Fatal("HEAD debe responder sin cuerpo")
	}
}
