package operation

import (
	"context"
	"net/http"
	"slices"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/pagination"
)

// Access indica qué sesión exige una operación.
type Access int

const (
	// Public no exige sesión; si llega una válida, se entrega al handler.
	Public Access = iota
	// Global exige sesión de usuario (no clave API) sin empresa activa obligatoria.
	Global
	// Tenant exige empresa activa y el permiso indicado.
	Tenant
)

// Operation es una entrada del registro.
type Operation struct {
	Access     Access
	Permission string
	Run        Handler
}

// Registry guarda las operaciones de todos los módulos y las despacha.
type Registry struct {
	auth       *auth.Service
	available  bool
	operations map[string]Operation
}

// NewRegistry crea un registro; available es false cuando no hay base de datos.
func NewRegistry(a *auth.Service, available bool) *Registry {
	return &Registry{auth: a, available: available, operations: map[string]Operation{}}
}

// Public registra una operación sin sesión obligatoria.
func (r *Registry) Public(name string, run Handler) {
	r.operations[name] = Operation{Access: Public, Run: run}
}

// Global registra una operación de usuario sin empresa activa obligatoria.
func (r *Registry) Global(name string, run Handler) {
	r.operations[name] = Operation{Access: Global, Run: run}
}

// Tenant registra una operación de empresa que exige permission.
func (r *Registry) Tenant(name, permission string, run Handler) {
	r.operations[name] = Operation{Access: Tenant, Permission: permission, Run: run}
}

// Names devuelve los nombres registrados en orden alfabético.
func (r *Registry) Names() []string {
	names := []string{}

	for name := range r.operations {
		names = append(names, name)
	}

	slices.Sort(names)

	return names
}

// Call autentica, autoriza, normaliza la entrada y ejecuta la operación.
func (r *Registry) Call(ctx context.Context, method string, in Input, header http.Header) (Output, error) {
	op, ok := r.operations[method]
	if !ok {
		return Output{}, apperrors.Unimplemented(constants.MsgUnknownOperation)
	}

	if !r.available {
		return Output{}, apperrors.Unavailable(constants.MsgDatabaseNotReady)
	}

	p, err := r.principal(ctx, op, header)
	if err != nil {
		return Output{}, err
	}

	in, err = normalize(method, in, header)
	if err != nil {
		return Output{}, err
	}

	out, err := op.Run(ctx, p, in)

	return out, apperrors.Translate(err)
}

func (r *Registry) principal(ctx context.Context, op Operation, header http.Header) (auth.Principal, error) {
	if op.Access == Public {
		// la sesión es opcional para operaciones públicas
		p, _ := r.auth.Authenticate(ctx, header)

		return p, nil
	}

	p, err := r.auth.Authenticate(ctx, header)
	if err != nil {
		return p, err
	}

	if op.Access == Global {
		if p.AuthMethod == constants.AuthAPI {
			return p, apperrors.Denied()
		}

		return p, nil
	}

	p, err = r.auth.Tenant(ctx, p, p.OrganizationID)
	if err != nil {
		return p, err
	}

	if !constants.Allowed(p.Role, op.Permission) {
		return p, apperrors.Denied()
	}

	return p, nil
}

func normalize(method string, in Input, header http.Header) (Input, error) {
	if in.Data == nil {
		in.Data = map[string]any{}
	}

	if in.Filters == nil {
		in.Filters = map[string]any{}
	}

	if method == constants.OpRefreshToken {
		request := http.Request{Header: header}
		cookie, err := request.Cookie(constants.CookieRefresh)
		if err != nil {
			return in, apperrors.Unauthorized()
		}

		in.RefreshToken = cookie.Value
	}

	var ok bool
	in.Page, in.PageSize, ok = pagination.Normalize(in.Page, in.PageSize)
	if !ok {
		return in, apperrors.Invalid(constants.MsgInvalidPage)
	}

	return in, nil
}
