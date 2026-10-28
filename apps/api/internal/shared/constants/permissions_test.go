package constants

import "testing"

func TestCapabilitiesFollowCanonicalPermissions(t *testing.T) {
	for _, role := range []string{RoleAdmin, RoleOperator, RoleViewer, "unknown"} {
		capabilities := Capabilities(role)

		for _, permission := range []string{PermissionRead, PermissionRespond, PermissionAdmin} {
			if capabilities[permission] != Allowed(role, permission) {
				t.Fatalf("%s: %s no coincide", role, permission)
			}
		}

		for _, key := range []string{"audit.view", "settings.view", "webhooks.view", "users.view"} {
			if capabilities[key] != Allowed(role, PermissionAdmin) {
				t.Fatalf("%s: %s amplía permisos", role, key)
			}
		}
	}
}
