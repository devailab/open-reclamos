// Package system expone el estado básico de la aplicación.
package system

import (
	"net/http"

	"openreclamos.com/api/gen/openreclamos/system/v1/systemv1connect"
	"openreclamos.com/api/internal/modules/system/rpc"
	"openreclamos.com/api/internal/shared/constants"
)

type Module struct {
	ping rpc.Ping
}

func New(appName, version string) *Module {
	return &Module{ping: rpc.Ping{AppName: appName, Version: version}}
}

// RegisterHTTP publica el SystemService bajo /rpc.
func (m *Module) RegisterHTTP(mux *http.ServeMux) {
	path, handler := systemv1connect.NewSystemServiceHandler(m.ping)

	mux.Handle(constants.RPCMount+path, http.StripPrefix(constants.RPCMount, handler))
}
