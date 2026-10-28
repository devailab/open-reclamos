package app

import (
	"context"
	"net/http"
	"time"

	"openreclamos.com/api/internal/modules/system"
	"openreclamos.com/api/internal/shared/assets"
	"openreclamos.com/api/internal/shared/database"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/server"
)

// reservedPrefixes responden 404 en vez de caer en la SPA.
var reservedPrefixes = []string{"/api/", "/rpc/", "/auth/", "/health/"}

// Handler arma todas las rutas HTTP: salud, configuración pública, RPC, módulos y SPA.
func (a *App) Handler(version string) http.Handler {
	mux := http.NewServeMux()

	a.registerHealth(mux)

	mux.HandleFunc("GET /api/config", func(w http.ResponseWriter, _ *http.Request) {
		server.WriteJSON(w, http.StatusOK, struct {
			AppName               string `json:"appName"`
			DocumentLookupEnabled bool   `json:"documentLookupEnabled"`
		}{AppName: a.Config.AppName, DocumentLookupEnabled: a.Config.DocumentLookupEnabled()})
	})

	system.New(a.Config.AppName, version).RegisterHTTP(mux)
	operation.RegisterConnect(mux, a.Registry)
	a.Complaints.RegisterHTTP(mux)
	a.Organizations.RegisterHTTP(mux)
	a.Identity.RegisterHTTP(mux)
	a.Integrations.RegisterHTTP(mux, a.Registry)

	for _, prefix := range reservedPrefixes {
		mux.Handle(prefix, http.NotFoundHandler())
	}

	mux.Handle("/", server.NewWebHandler(assets.Web()))

	return server.Security(mux, a.Config.AllowedOrigins)
}

func (a *App) registerHealth(mux *http.ServeMux) {
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, _ *http.Request) {
		server.WriteJSON(w, http.StatusOK, map[string]string{"status": "alive"})
	})

	mux.HandleFunc("GET /health/ready", func(w http.ResponseWriter, r *http.Request) {
		if a.DB == nil {
			server.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "database_not_configured"})

			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		sqlDB, err := a.DB.DB()
		if err != nil || sqlDB.PingContext(ctx) != nil {
			server.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "database_unavailable"})

			return
		}

		if database.Ready(ctx, a.DB) != nil {
			server.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "migrations_required"})

			return
		}

		server.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
}
