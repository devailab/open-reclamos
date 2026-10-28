// Package operation define el contrato común de las operaciones RPC: entrada,
// salida, nivel de acceso y el registro que las despacha.
package operation

import (
	"context"
	"net/http"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/pagination"
)

// Input es la petición genérica que llega por Connect, la API REST o MCP.
type Input struct {
	RefreshToken   string
	ID             string
	Data           map[string]any
	Filters        map[string]any
	Page, PageSize int
}

// Output es la respuesta genérica; Document se usa para archivos.
type Output struct {
	AccessToken           string
	AccessExpiresAt       int64
	Data                  any
	Document              []byte
	FileName, ContentType string
	Header                http.Header
}

// Handler implementa una operación.
type Handler func(ctx context.Context, p auth.Principal, in Input) (Output, error)

// Record envuelve un dato como respuesta.
func Record(v any) Output { return Output{Data: v} }

// Success es la respuesta estándar de los comandos sin dato de retorno.
func Success() Output { return Record(map[string]bool{"success": true}) }

// Status responde con un estado (por ejemplo, "queued" o "sent").
func Status(status string) Output { return Record(map[string]string{"status": status}) }

// Rows pagina en memoria una lista completa con los filtros de la petición.
func Rows[T any](items []T, in Input) Output {
	return Record(pagination.Rows(items, in.Filters, in.Page, in.PageSize))
}

// Page responde con una página calculada en la base de datos.
func Page(rows any, total any, in Input) Output {
	return Record(pagination.Result(rows, total, in.Page, in.PageSize))
}

// File responde con un documento descargable.
func File(document []byte, fileName, contentType string) Output {
	return Output{Document: document, FileName: fileName, ContentType: contentType}
}

// Tokens responde con tokens recién emitidos y el dato indicado.
func Tokens(issued auth.Issued, data any) Output {
	return Output{
		Data:            data,
		Header:          issued.Header,
		AccessToken:     issued.AccessToken,
		AccessExpiresAt: issued.AccessExpiresAt,
	}
}

// Session emite tokens para claims y responde con data.
func Session(a *auth.Service, claims auth.Claims, data any) (Output, error) {
	issued, err := a.Issue(claims)
	if err != nil {
		return Output{}, err
	}

	return Tokens(issued, data), nil
}

// Login emite tokens a partir del access token de un login nuevo.
func Login(a *auth.Service, raw string, user any) (Output, error) {
	issued, err := a.IssueFromAccess(raw)
	if err != nil {
		return Output{}, err
	}

	return Tokens(issued, map[string]any{"user": user}), nil
}
