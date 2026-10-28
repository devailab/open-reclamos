// Package mailer envía correos por SMTP con un adjunto PDF opcional.
package mailer

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"

	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// Modos TLS admitidos por SMTP_TLS_MODE.
const (
	TLSModeImplicit = "tls"
	TLSModeStartTLS = "starttls"
	TLSModeNone     = "none"
)

type Mailer struct {
	Config *config.Config
}

// Attachment es un PDF adjunto al correo.
type Attachment struct {
	Name string
	Data []byte
}

// Enabled indica si SMTP está configurado.
func (m *Mailer) Enabled() bool { return m.Config.SMTPEnabled }

// Send entrega un correo de texto plano; sin SMTP configurado no hace nada.
func (m *Mailer) Send(ctx context.Context, to, subject, body string, attachment *Attachment) error {
	cfg := m.Config
	if !cfg.SMTPEnabled {
		return nil
	}

	if !utils.ValidEmail(to) || !utils.ValidEmail(cfg.SMTPFrom) {
		return apperrors.Invalid(constants.MsgInvalidMailAddress)
	}

	address := net.JoinHostPort(cfg.SMTPHost, cfg.SMTPPort)
	dialer := net.Dialer{Timeout: 10 * time.Second}
	var conn net.Conn
	var err error
	tlsConfig := &tls.Config{ServerName: cfg.SMTPHost, MinVersion: tls.VersionTLS12}

	if cfg.SMTPTLSMode == TLSModeImplicit {
		conn, err = (&tls.Dialer{NetDialer: &dialer, Config: tlsConfig}).DialContext(ctx, "tcp", address)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", address)
	}

	if err != nil {
		return &Failure{Stage: StageConnect, Cause: err}
	}

	defer conn.Close()

	conn.SetDeadline(time.Now().Add(20 * time.Second))

	client, err := smtp.NewClient(conn, cfg.SMTPHost)
	if err != nil {
		return &Failure{Stage: StageConnect, Cause: err}
	}

	defer client.Close()

	if cfg.SMTPTLSMode == TLSModeStartTLS {
		if err = client.StartTLS(tlsConfig); err != nil {
			return &Failure{Stage: StageTLS, Cause: err}
		}
	} else if cfg.SMTPTLSMode != TLSModeImplicit && cfg.SMTPTLSMode != TLSModeNone {
		return apperrors.Invalid(constants.MsgInvalidSMTPTLSMode)
	}

	if cfg.SMTPUser != "" {
		if err = client.Auth(smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)); err != nil {
			return &Failure{Stage: StageAuth, Cause: err}
		}
	}

	if err = client.Mail(cfg.SMTPFrom); err != nil {
		return &Failure{Stage: StageFrom, Cause: err}
	}

	if err = client.Rcpt(to); err != nil {
		return &Failure{Stage: StageRecipient, Cause: err}
	}

	writer, err := client.Data()
	if err != nil {
		return &Failure{Stage: StageData, Cause: err}
	}

	if _, err = io.WriteString(writer, message(cfg.SMTPFrom, to, subject, body, attachment)); err != nil {
		return &Failure{Stage: StageData, Cause: err}
	}

	if err = writer.Close(); err != nil {
		return &Failure{Stage: StageData, Cause: err}
	}

	return client.Quit()
}

func message(from, to, subject, body string, attachment *Attachment) string {
	boundary := "open-reclamos-" + utils.Token()

	header := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%q\r\n\r\n",
		from,
		to,
		mime.QEncoding.Encode("UTF-8", subject),
		boundary,
	)

	message := header + "--" + boundary + "\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" + wrapped64(
		[]byte(body),
	) + "\r\n"

	if attachment != nil {
		message += "--" + boundary + "\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename=\"documento.pdf\"\r\nContent-Transfer-Encoding: base64\r\n\r\n" + wrapped64(
			attachment.Data,
		) + "\r\n"
	}

	return message + "--" + boundary + "--\r\n"
}

func wrapped64(data []byte) string {
	v := base64.StdEncoding.EncodeToString(data)
	var b strings.Builder

	for len(v) > 76 {
		b.WriteString(v[:76])
		b.WriteString("\r\n")

		v = v[76:]
	}

	b.WriteString(v)

	return b.String()
}
