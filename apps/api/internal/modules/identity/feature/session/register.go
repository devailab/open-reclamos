package session

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Register crea una cuenta pública si ALLOW_PUBLIC_REGISTRATION y la instalación ya existe.
func (f *Feature) Register(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	if !f.deps.Config.AllowPublicRegistration {
		return operation.Output{}, apperrors.Denied()
	}

	count, err := f.deps.Repo.CountUsers(ctx)
	if err != nil {
		return operation.Output{}, err
	}

	if count == 0 {
		return operation.Output{}, apperrors.Conflict(constants.MsgInstallFirst)
	}

	return f.CreateAccount(ctx, in)
}

// CreateAccount crea usuario y credencial local. Abre su sesión, salvo que el registro
// público exija verificar el email: entonces envía el código y responde sin sesión.
func (f *Feature) CreateAccount(ctx context.Context, in operation.Input) (operation.Output, error) {
	name := utils.Text(in.Data, "name")
	lastName := utils.Text(in.Data, "last_name")
	email := strings.ToLower(utils.Text(in.Data, "email"))
	password := utils.RawText(in.Data, "password")
	if !utils.Required(name, 120) || !utils.Required(lastName, 120) || !utils.ValidEmail(email) ||
		!utils.ValidPassword(password) {
		return operation.Output{}, apperrors.Invalid(constants.MsgAccountDataRequired)
	}

	documentType, documentNumber, ok := utils.UserDocument(in.Data)
	if !ok {
		return operation.Output{}, apperrors.Invalid(constants.MsgUserDocumentRequired)
	}

	verify := f.verificationRequired()
	encoded, err := auth.HashPassword(password)
	if err != nil {
		return operation.Output{}, err
	}

	var u models.User
	var raw string

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := q.BootstrapLock(ctx); err != nil {
			return err
		}

		inUse, err := q.DocumentInUse(ctx, documentType, documentNumber)
		if err != nil {
			return err
		}

		if inUse {
			return apperrors.Conflict(constants.MsgUserDocumentTaken)
		}

		u, err = q.CreateUser(ctx, repository.CreateUserParams{
			ID: utils.NewID(), Name: name, LastName: lastName, Email: email,
			DocumentType: documentType, DocumentNumber: documentNumber, EmailVerified: !verify,
		})
		if err != nil {
			return err
		}

		if err = q.CreateCredential(ctx, repository.CreateCredentialParams{ID: utils.NewID(), AccountID: u.ID, UserID: u.ID, Password: &encoded}); err != nil {
			return err
		}

		if verify {
			return nil
		}

		_, raw, err = f.deps.Auth.NewContext(u.ID, constants.AuthLocal)

		return err
	})
	if err != nil {
		return operation.Output{}, err
	}

	if verify {
		return f.pendingVerification(ctx, u.ID, u.Email)
	}

	return operation.Login(f.deps.Auth, raw, publicUser(u.ID, u.Name, u.LastName, u.Email))
}
