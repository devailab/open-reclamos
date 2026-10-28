// Package rpc implementa el SystemService de Connect.
package rpc

import (
	"context"

	"connectrpc.com/connect"
	systemv1 "openreclamos.com/api/gen/openreclamos/system/v1"
)

// Ping responde con el nombre y la versión de la aplicación.
type Ping struct {
	AppName string
	Version string
}

func (h Ping) Ping(
	_ context.Context,
	_ *connect.Request[systemv1.PingRequest],
) (*connect.Response[systemv1.PingResponse], error) {
	return connect.NewResponse(&systemv1.PingResponse{AppName: h.AppName, Version: h.Version}), nil
}
