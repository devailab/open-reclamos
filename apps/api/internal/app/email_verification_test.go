package app

import (
	"context"
	"encoding/base64"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/modules/identity/feature/installation"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/database/databasetest"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

var verificationCode = regexp.MustCompile(`\b\d{6}\b`)

// plainText decodifica la parte text/plain (base64) del mensaje MIME recibido.
func plainText(t *testing.T, message string) string {
	t.Helper()

	_, part, _ := strings.Cut(message, "Content-Transfer-Encoding: base64")
	encoded, _, _ := strings.Cut(strings.TrimSpace(part), "--")
	decoded, err := base64.StdEncoding.DecodeString(strings.Join(strings.Fields(encoded), ""))
	if err != nil {
		t.Fatal(err)
	}

	return string(decoded)
}

// Con registro público y SMTP activo, la cuenta abre sesión solo tras confirmar el
// código; el administrador inicial no lo necesita y los documentos no se repiten.
func TestPublicRegistrationRequiresEmailVerification(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		host, port, messages := fakeSMTP(t)

		s := New(db, config.Config{
			PublicBaseURL: "http://localhost:8080", AllowPublicRegistration: true,
			SMTPEnabled: true, SMTPHost: host, SMTPPort: port, SMTPFrom: "sender@example.com", SMTPTLSMode: "none",
		})

		password := "Password-seguro-2026"

		if err := s.Bootstrap(ctx, installation.Admin{
			Name: "Plataforma", LastName: "Prueba", Email: "admin@example.com", Password: password,
			DocumentType: "DNI", DocumentNumber: "00012345",
		}); err != nil {
			t.Fatal(err)
		}

		admin, err := s.Call(
			ctx,
			"Login",
			operation.Input{Data: map[string]any{"email": "admin@example.com", "password": password}},
			nil,
		)
		if err != nil || admin.AccessToken == "" {
			t.Fatal("el administrador inicial no requiere verificación", err)
		}

		register := func(email, documentType, documentNumber string) (operation.Output, error) {
			return s.Call(ctx, "Register", operation.Input{Data: map[string]any{
				"name": "Ana", "last_name": "Prueba", "email": email, "password": password,
				"document_type": documentType, "document_number": documentNumber,
			}}, nil)
		}

		if _, err = register("copy@example.com", "dni", "00012345"); connect.CodeOf(
			err,
		) != connect.CodeFailedPrecondition {
			t.Fatal("el documento debe ser único entre cuentas", err)
		}

		if _, err = register("missing@example.com", "RUC", "20123456789"); connect.CodeOf(
			err,
		) != connect.CodeInvalidArgument {
			t.Fatal("tipo de documento fuera del catálogo", err)
		}

		// "12345" y "00012345" son documentos distintos: el número se compara como texto.
		out, err := register("ana@example.com", "DNI", "12345")
		if err != nil || out.AccessToken != "" || utils.PublicData(out.Data)["verification_required"] != true {
			t.Fatal("el registro debe esperar la verificación sin abrir sesión", err)
		}

		var code string

		select {
		case message := <-messages:
			code = verificationCode.FindString(plainText(t, message))

		case <-time.After(10 * time.Second):
			t.Fatal("no se envió el código de verificación")
		}

		login := func() (operation.Output, error) {
			return s.Call(
				ctx,
				"Login",
				operation.Input{Data: map[string]any{"email": "ana@example.com", "password": password}},
				nil,
			)
		}

		if out, err = login(); err != nil || out.AccessToken != "" ||
			utils.PublicData(out.Data)["verification_required"] != true {
			t.Fatal("una cuenta sin verificar no abre sesión", err)
		}

		select {
		case <-messages:
			t.Fatal("dentro del minuto siguiente no se reenvía otro código")

		case <-time.After(200 * time.Millisecond):
		}

		verify := func(value string) (operation.Output, error) {
			return s.Call(
				ctx,
				"VerifyEmail",
				operation.Input{Data: map[string]any{"email": "ana@example.com", "code": value}},
				nil,
			)
		}

		wrong := "000000"
		if code == wrong {
			wrong = "111111"
		}

		if _, err = verify(wrong); connect.CodeOf(err) != connect.CodeInvalidArgument {
			t.Fatal("un código incorrecto se rechaza", err)
		}

		if out, err = verify(code); err != nil || out.AccessToken == "" {
			t.Fatal("el código correcto verifica y abre sesión", err)
		}

		if _, err = verify(code); connect.CodeOf(err) != connect.CodeInvalidArgument {
			t.Fatal("el código no se reutiliza", err)
		}

		if out, err = login(); err != nil || out.AccessToken == "" {
			t.Fatal("la cuenta verificada inicia sesión", err)
		}

		// Un pasaporte no se repite cambiando solo la capitalización.
		if _, err = register("luis@example.com", "PASAPORTE", "ab123"); err != nil {
			t.Fatal(err)
		}

		if _, err = register("copia@example.com", "PASAPORTE", "AB123"); connect.CodeOf(
			err,
		) != connect.CodeFailedPrecondition {
			t.Fatal("el pasaporte debe compararse sin distinguir mayúsculas", err)
		}

		code = verificationCode.FindString(plainText(t, <-messages))
		// Diez intentos simultáneos no superan el máximo: después ni el código correcto sirve.
		var wait sync.WaitGroup

		for range 10 {
			wait.Go(func() {
				s.Call(
					ctx,
					"VerifyEmail",
					operation.Input{Data: map[string]any{"email": "luis@example.com", "code": "x"}},
					nil,
				)
			})
		}

		wait.Wait()

		if _, err = s.Call(ctx, "VerifyEmail", operation.Input{Data: map[string]any{"email": "luis@example.com", "code": code}}, nil); connect.CodeOf(
			err,
		) != connect.CodeInvalidArgument {
			t.Fatal("los intentos agotados invalidan el código", err)
		}
	})
}

// Si el SMTP falla, la cuenta queda creada sin sesión y el siguiente login reintenta el
// envío de inmediato, sin esperar el minuto entre reenvíos.
func TestEmailVerificationSurvivesSMTPFailure(t *testing.T) {
	databasetest.Run(t, databasetest.Options{SkipSeed: true}, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()

		s := New(db, config.Config{
			PublicBaseURL: "http://localhost:8080", AllowPublicRegistration: true,
			SMTPEnabled: true, SMTPHost: "127.0.0.1", SMTPPort: "1", SMTPFrom: "sender@example.com", SMTPTLSMode: "none",
		})

		password := "Password-seguro-2026"

		if err := s.Bootstrap(ctx, installation.Admin{
			Name: "Plataforma", LastName: "Prueba", Email: "admin@example.com", Password: password,
			DocumentType: "DNI", DocumentNumber: "11111111",
		}); err != nil {
			t.Fatal(err)
		}

		pending := func(method string, data map[string]any) {
			t.Helper()

			out, err := s.Call(ctx, method, operation.Input{Data: data}, nil)
			result := utils.PublicData(out.Data)
			if err != nil || out.AccessToken != "" || result["verification_required"] != true ||
				result["email_sent"] != false {
				t.Fatalf("%s debe responder pendiente y sin envío: %v %v", method, result, err)
			}
		}

		pending("Register", map[string]any{
			"name": "Ana", "last_name": "Prueba", "email": "ana@example.com", "password": password,
			"document_type": "DNI", "document_number": "22222222",
		})

		pending("Login", map[string]any{"email": "ana@example.com", "password": password})

		var codes int64

		if err := db.Table("email_verifications").Count(&codes).Error; err != nil || codes != 0 {
			t.Fatal("un código que no se envió no debe quedar vigente", codes, err)
		}
	})
}
