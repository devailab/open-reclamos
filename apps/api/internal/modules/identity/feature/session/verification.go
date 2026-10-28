package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"time"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	verificationTTL         = 15 * time.Minute
	verificationCooldown    = time.Minute
	maxVerificationAttempts = 5
)

// verificationRequired: con registro público y SMTP activo, las cuentas registradas
// deben confirmar su email antes de abrir sesión.
func (f *Feature) verificationRequired() bool {
	return f.deps.Mailer.Enabled() && f.deps.Config.AllowPublicRegistration
}

// pendingVerification envía (o conserva) el código y responde sin sesión. Un fallo del
// SMTP no es un error de la operación: la cuenta ya existe y el cliente ofrece reenviar.
func (f *Feature) pendingVerification(ctx context.Context, userID, email string) (operation.Output, error) {
	sent, err := f.sendVerificationCode(ctx, userID, email)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Record(map[string]any{"verification_required": true, "email": email, "email_sent": sent}), nil
}

// sendVerificationCode envía un código nuevo; dentro del minuto siguiente a un envío
// conserva el código vigente para no inundar el buzón. Devuelve false si el SMTP falló.
func (f *Feature) sendVerificationCode(ctx context.Context, userID, email string) (bool, error) {
	current, err := f.deps.Repo.GetEmailVerification(ctx, userID)
	if err == nil && time.Since(current.SentAt) < verificationCooldown {
		return true, nil
	}

	if err != nil && !repository.IsNotFound(err) {
		return false, err
	}

	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return false, err
	}

	code := fmt.Sprintf("%06d", n.Int64())
	now := time.Now().UTC()

	if err = f.deps.Repo.SaveEmailVerification(ctx, models.EmailVerification{
		UserID: userID, CodeHash: codeHash(userID, code), ExpiresAt: now.Add(verificationTTL), SentAt: now,
	}); err != nil {
		return false, err
	}

	body := fmt.Sprintf(constants.MailVerifyEmailBody, code)

	if err = f.deps.Mailer.Send(ctx, email, constants.MailVerifyEmailSubject, body, nil); err != nil {
		// Sin código enviado no hay espera: el siguiente intento genera otro de inmediato.
		return false, f.deps.Repo.DeleteEmailVerification(ctx, userID)
	}

	return true, nil
}

func codeHash(userID, code string) string {
	sum := sha256.Sum256([]byte(userID + ":" + code))

	return hex.EncodeToString(sum[:])
}

// VerifyEmail confirma el código enviado al registrarse y abre la sesión local.
func (f *Feature) VerifyEmail(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	invalid := apperrors.Invalid(constants.MsgEmailCodeInvalid)
	u, err := f.deps.Repo.GetUserByEmail(ctx, strings.ToLower(utils.Text(in.Data, "email")))
	if err != nil || !u.Active || u.EmailVerified {
		return operation.Output{}, invalid
	}

	// Consumir el intento antes de comparar evita superar el máximo con solicitudes en paralelo.
	allowed, err := f.deps.Repo.UseEmailVerificationAttempt(ctx, u.ID, maxVerificationAttempts)
	if err != nil {
		return operation.Output{}, err
	}

	if !allowed {
		return operation.Output{}, invalid
	}

	v, err := f.deps.Repo.GetEmailVerification(ctx, u.ID)
	if err != nil {
		return operation.Output{}, invalid
	}

	code := utils.Text(in.Data, "code")
	if subtle.ConstantTimeCompare([]byte(codeHash(u.ID, code)), []byte(v.CodeHash)) != 1 {
		return operation.Output{}, invalid
	}

	var raw string

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := q.CompleteEmailVerification(ctx, u.ID); err != nil {
			return err
		}

		var err error
		_, raw, err = f.deps.Auth.NewContext(u.ID, constants.AuthLocal)

		return err
	})
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Login(f.deps.Auth, raw, publicUser(u.ID, u.Name, u.LastName, u.Email))
}
