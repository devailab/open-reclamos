package server

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/constants"
)

// WriteJSON responde JSON sin caché.
func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}

// RequireDatabase responde 503 cuando la aplicación arrancó sin base de datos.
func RequireDatabase(db *gorm.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if db == nil {
			http.Error(w, constants.HTTPDatabaseNotConfigured, http.StatusServiceUnavailable)

			return
		}

		next(w, r)
	}
}

// NewWebHandler sirve la SPA: solo rutas existentes reciben index.html; assets desconocidos son 404.
func NewWebHandler(web fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(web))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.WriteHeader(http.StatusMethodNotAllowed)

			return
		}

		if IsSPARoute(r.URL.Path) {
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFileFS(w, r, web, "index.html")

			return
		}

		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		info, err := fs.Stat(web, name)
		if err != nil || info.IsDir() || strings.HasPrefix(name, ".") {
			http.NotFound(w, r)

			return
		}

		if strings.HasPrefix(name, "assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}

		fileServer.ServeHTTP(w, r)
	})
}
