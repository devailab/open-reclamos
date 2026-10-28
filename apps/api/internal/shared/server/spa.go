package server

import "strings"

// Rutas de React Router. Los endpoints y assets conservan sus propios 404.
var spaRoutes = []string{
	"/", "/status", "/login", "/login/:organizationSlug", "/register", "/install",
	"/invite/:token", "/setup", "/c/:slug", "/s/:slug",
	"/dashboard", "/dashboard/account", "/dashboard/organizations/new",
	"/dashboard/complaints", "/dashboard/complaints/:id", "/dashboard/complaints/stores/:storeId",
	"/dashboard/stores", "/dashboard/reasons", "/dashboard/categories", "/dashboard/users",
	"/dashboard/settings", "/dashboard/audit", "/dashboard/exports", "/dashboard/notices",
	"/dashboard/notices/website", "/dashboard/notices/printable", "/dashboard/webhooks",
	"/dashboard/webhooks/deliveries", "/dashboard/platform", "/dashboard/admin-settings",
}

// IsSPARoute indica si la ruta pertenece a React Router y debe recibir index.html.
func IsSPARoute(path string) bool {
	if path == "/index.html" {
		return true
	}

	for _, pattern := range spaRoutes {
		if pattern == path {
			return true
		}

		if !strings.Contains(pattern, ":") {
			continue
		}

		parts, segments := strings.Split(pattern, "/"), strings.Split(path, "/")
		if len(parts) != len(segments) {
			continue
		}

		matches := true

		for index, part := range parts {
			if strings.HasPrefix(part, ":") {
				if segments[index] == "" || segments[index] == "." || segments[index] == ".." {
					matches = false

					break
				}
			} else if part != segments[index] {
				matches = false

				break
			}
		}

		if matches {
			return true
		}
	}

	return false
}
