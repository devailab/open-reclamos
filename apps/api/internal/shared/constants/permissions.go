package constants

import "slices"

// Roles fijos de una empresa. Se guardan en la base de datos; sus permisos solo existen aquí.
const (
	RoleAdmin    = "admin"
	RoleOperator = "operator"
	RoleViewer   = "viewer"
	// RoleConsumer firma el historial creado desde el formulario público.
	RoleConsumer = "consumer"
)

// Roles asignables a miembros e invitaciones.
var MemberRoles = []string{RoleAdmin, RoleOperator, RoleViewer}

// Permisos que exige cada operación de empresa.
const (
	// PermissionNone solo exige pertenecer a la empresa.
	PermissionNone = ""
	// PermissionRead permite consultar reclamos, tiendas y catálogos.
	PermissionRead = "read"
	// PermissionRespond permite revisar, clasificar y responder reclamos.
	PermissionRespond = "respond"
	// PermissionAdmin permite configurar la empresa, usuarios e integraciones.
	PermissionAdmin = "admin"
)

// rolePermissions define qué permisos tiene cada rol. El administrador los tiene todos.
var rolePermissions = map[string][]string{
	RoleAdmin:    {PermissionRead, PermissionRespond, PermissionAdmin},
	RoleOperator: {PermissionRead, PermissionRespond},
	RoleViewer:   {PermissionRead},
}

// Allowed indica si el rol puede ejecutar una operación que exige el permiso dado.
func Allowed(role, permission string) bool {
	if permission == PermissionNone {
		return true
	}

	return slices.Contains(rolePermissions[role], permission)
}

// Capabilities publica capacidades de presentación derivadas de los permisos canónicos.
func Capabilities(role string) map[string]bool {
	read := Allowed(role, PermissionRead)
	admin := Allowed(role, PermissionAdmin)

	return map[string]bool{
		PermissionRead:    read,
		PermissionRespond: Allowed(role, PermissionRespond),
		PermissionAdmin:   admin,
		"dashboard.view":  read,
		"complaints.view": read,
		"stores.view":     read,
		"reasons.view":    read,
		"categories.view": read,
		"exports.view":    read,
		"notices.view":    read,
		"printable.view":  read,
		"audit.view":      admin,
		"settings.view":   admin,
		"webhooks.view":   admin,
		"users.view":      admin,
	}
}
