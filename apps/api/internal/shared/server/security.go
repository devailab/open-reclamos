package server

import (
	"net"
	"net/http"
	"openreclamos.com/api/internal/shared/constants"
	"slices"
	"strings"
	"sync"
	"time"
)

type rateEntry struct {
	Count int
	Since time.Time
}

type rateLimiter struct {
	lock     sync.Mutex
	entries  map[string]rateEntry
	capacity int
}

func (limiter *rateLimiter) allow(key string, limit int, now time.Time) bool {
	limiter.lock.Lock()
	defer limiter.lock.Unlock()

	entry, exists := limiter.entries[key]
	if !exists && len(limiter.entries) >= limiter.capacity {
		for key, entry := range limiter.entries {
			if now.Sub(entry.Since) >= time.Minute {
				delete(limiter.entries, key)
			}
		}

		if len(limiter.entries) >= limiter.capacity {
			return false
		}
	}

	if !exists || now.Sub(entry.Since) >= time.Minute {
		entry = rateEntry{Since: now}
	}

	if entry.Count >= limit {
		return false
	}

	entry.Count++
	limiter.entries[key] = entry

	return true
}

// Security aplica cabeceras, CORS y rate limit básico sin depender de servicios
// externos ni confiar en forwarded IP.
func Security(next http.Handler, origins []string) http.Handler {
	limiter := rateLimiter{entries: map[string]rateEntry{}, capacity: 10000}
	allowAnyOrigin := slices.Contains(origins, "*")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")

		samlCallback := strings.HasSuffix(r.URL.Path, "/saml/acs")
		origin := r.Header.Get("Origin")
		if origin != "" && !samlCallback {
			w.Header().Add("Vary", "Origin")

			if !allowAnyOrigin && !slices.Contains(origins, origin) {
				http.Error(w, constants.HTTPOriginNotAllowed, http.StatusForbidden)

				return
			}

			// Con cookies, CORS exige devolver el origen concreto, incluso en modo *.
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == http.MethodOptions {
			w.Header().
				Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Connect-Protocol-Version, Connect-Timeout-Ms, Mcp-Session-Id, Mcp-Protocol-Version")

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.WriteHeader(204)

			return
		}

		if r.Method == http.MethodPost || r.Method == http.MethodDelete ||
			strings.HasPrefix(r.URL.Path, "/auth/sso/") && strings.HasSuffix(r.URL.Path, "/start") {
			ip, _, _ := net.SplitHostPort(r.RemoteAddr)
			limit := 120

			if strings.HasSuffix(r.URL.Path, "/"+constants.OpInstall) {
				limit = 5
			}

			if strings.HasSuffix(r.URL.Path, "/"+constants.OpLogin) ||
				strings.HasSuffix(r.URL.Path, "/"+constants.OpRegister) ||
				strings.HasSuffix(r.URL.Path, "/"+constants.OpVerifyEmail) ||
				strings.HasSuffix(r.URL.Path, "/"+constants.OpAcceptInvitation) ||
				strings.HasSuffix(r.URL.Path, "/"+constants.OpLookupDocument) ||
				strings.HasSuffix(r.URL.Path, "/start") {
				limit = 10
			}

			if !limiter.allow(ip+"|"+r.URL.Path, limit, time.Now()) {
				w.Header().Set("Retry-After", "60")
				http.Error(w, constants.HTTPTooManyRequests, http.StatusTooManyRequests)

				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
