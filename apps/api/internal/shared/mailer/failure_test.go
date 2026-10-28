package mailer

import (
	"net/textproto"
	"strings"
	"testing"

	"connectrpc.com/connect"
)

func TestSMTPTestFailureExplainsAuthenticationWithoutProviderSecrets(t *testing.T) {
	err := DescribeTestFailure(
		&Failure{
			Stage: "auth",
			Cause: &textproto.Error{Code: 535, Msg: "Authentication Failed token=private-secret"},
		},
	)
	if connect.CodeOf(err) != connect.CodeFailedPrecondition {
		t.Fatal("error SMTP no accionable", err)
	}

	if !strings.Contains(err.Error(), "SMTP_USER") || !strings.Contains(err.Error(), "535") {
		t.Fatal("falta el diagnóstico de autenticación", err)
	}

	if strings.Contains(err.Error(), "private-secret") {
		t.Fatal("se filtró texto sensible del proveedor")
	}
}
