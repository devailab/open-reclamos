package operation

import (
	"context"
	"net/http"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/structpb"
	backendv1 "openreclamos.com/api/gen/openreclamos/backend/v1"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/utils"
)

// maxRequestBytes limita el tamaño de cada petición RPC.
const maxRequestBytes = 2 * 1024 * 1024

// RegisterConnect publica cada método del BackendService en /rpc/ usando el registro.
func RegisterConnect(mux *http.ServeMux, r *Registry) {
	descriptor := backendv1.File_openreclamos_backend_v1_backend_proto.Services().Get(0)

	for i := 0; i < descriptor.Methods().Len(); i++ {
		method := descriptor.Methods().Get(i)
		name := string(method.Name())
		procedure := constants.RPCPrefix + string(descriptor.FullName()) + "/" + name

		mux.Handle(
			procedure,
			connect.NewUnaryHandler(
				procedure,
				func(ctx context.Context, request *connect.Request[backendv1.OperationRequest]) (*connect.Response[backendv1.OperationResponse], error) {
					in := Input{
						ID:       request.Msg.Id,
						Data:     request.Msg.Data.AsMap(),
						Filters:  request.Msg.Filters.AsMap(),
						Page:     int(request.Msg.Page),
						PageSize: int(request.Msg.PageSize),
					}

					out, err := r.Call(ctx, name, in, request.Header())
					if err != nil {
						return nil, err
					}

					data, err := structpb.NewStruct(utils.PublicData(out.Data))
					if err != nil {
						return nil, err
					}

					response := connect.NewResponse(
						&backendv1.OperationResponse{
							Data:            data,
							Document:        out.Document,
							FileName:        out.FileName,
							ContentType:     out.ContentType,
							AccessToken:     out.AccessToken,
							AccessExpiresAt: out.AccessExpiresAt,
						},
					)

					for key, values := range out.Header {
						for _, v := range values {
							response.Header().Add(key, v)
						}
					}

					return response, nil
				},
				connect.WithSchema(method),
				connect.WithReadMaxBytes(maxRequestBytes),
			),
		)
	}
}
