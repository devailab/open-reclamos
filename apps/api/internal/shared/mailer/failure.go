package mailer

import (
	"errors"
	"fmt"
	"net/textproto"

	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
)

// Pasos del diálogo SMTP en los que puede fallar un envío.
const (
	StageConnect   = "connect"
	StageTLS       = "tls"
	StageAuth      = "auth"
	StageFrom      = "from"
	StageRecipient = "recipient"
	StageData      = "data"
)

// Failure conserva el paso SMTP que falló.
type Failure struct {
	Stage string
	Cause error
}

func (f *Failure) Error() string { return "SMTP " + f.Stage + ": " + f.Cause.Error() }

func (f *Failure) Unwrap() error { return f.Cause }

var stageMessages = map[string]string{
	StageConnect:   constants.MsgSMTPConnect,
	StageTLS:       constants.MsgSMTPTLS,
	StageAuth:      constants.MsgSMTPAuth,
	StageFrom:      constants.MsgSMTPFrom,
	StageRecipient: constants.MsgSMTPRecipient,
	StageData:      constants.MsgSMTPData,
}

// DescribeTestFailure muestra al administrador el paso fallido sin devolver secretos ni texto del proveedor.
func DescribeTestFailure(err error) error {
	var failure *Failure
	if !errors.As(err, &failure) {
		return apperrors.Translate(err)
	}

	message, ok := stageMessages[failure.Stage]
	if !ok {
		message = constants.MsgSMTPTestFailed
	}

	var reply *textproto.Error
	if errors.As(err, &reply) {
		message += fmt.Sprintf(constants.MsgSMTPCodeSuffix, reply.Code)
	}

	return apperrors.Conflict(message)
}
