// Package errors centraliza los errores de dominio que viajan hasta el cliente.
// Importar con alias: apperrors "openreclamos.com/api/internal/shared/errors".
package errors

import (
	stderrors "errors"

	"connectrpc.com/connect"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
)

// Códigos devueltos por Code, útiles para traducir a HTTP.
const (
	CodeUnauthenticated  = "unauthenticated"
	CodePermissionDenied = "permission_denied"
	CodeNotFound         = "not_found"
	CodeInvalidArgument  = "invalid_argument"
	CodeAlreadyExists    = "already_exists"
	CodeFailedCondition  = "failed_precondition"
)

// Invalid indica datos de entrada inválidos.
func Invalid(message string) error {
	return connect.NewError(connect.CodeInvalidArgument, stderrors.New(message))
}

// Denied indica que la sesión no puede ejecutar la operación.
func Denied() error {
	return connect.NewError(connect.CodePermissionDenied, stderrors.New(constants.MsgDenied))
}

// Unauthorized indica que falta una sesión válida.
func Unauthorized() error {
	return connect.NewError(connect.CodeUnauthenticated, stderrors.New(constants.MsgUnauthorized))
}

// Conflict indica que el estado actual impide la operación.
func Conflict(message string) error {
	return connect.NewError(connect.CodeFailedPrecondition, stderrors.New(message))
}

// Unavailable indica que una dependencia (base de datos, workers) no está lista.
func Unavailable(message string) error {
	return connect.NewError(connect.CodeUnavailable, stderrors.New(message))
}

// Unimplemented indica una operación desconocida.
func Unimplemented(message string) error {
	return connect.NewError(connect.CodeUnimplemented, stderrors.New(message))
}

// Translate convierte errores de repositorio en errores seguros para el cliente.
func Translate(err error) error {
	if err == nil {
		return nil
	}

	var ce *connect.Error
	if stderrors.As(err, &ce) {
		return err
	}

	switch {
	case repository.IsNotFound(err):
		return connect.NewError(connect.CodeNotFound, stderrors.New(constants.MsgNotFound))

	case repository.IsDuplicate(err):
		return connect.NewError(connect.CodeAlreadyExists, stderrors.New(constants.MsgAlreadyExists))

	case repository.IsInvalidData(err):
		return Invalid(constants.MsgInvalidData)
	}

	return connect.NewError(connect.CodeInternal, stderrors.New(constants.MsgOperationFailed))
}

// Code devuelve el código Connect del error ("not_found", "permission_denied", ...).
func Code(err error) string { return connect.CodeOf(err).String() }

// Changed convierte "0 filas afectadas" en ErrNotFound.
func Changed(count int64, err error) error {
	if err != nil {
		return err
	}

	if count == 0 {
		return repository.ErrNotFound
	}

	return nil
}
