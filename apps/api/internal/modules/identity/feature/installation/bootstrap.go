package installation

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// Admin son los datos del administrador inicial; su email no requiere verificación.
type Admin struct {
	Name, Email, Password        string
	LastName                     string
	DocumentType, DocumentNumber string
}

// Bootstrap crea el primer administrador desde la consola (comando bootstrap).
func (f *Feature) Bootstrap(ctx context.Context, admin Admin) error {
	_, _, err := f.initialAdministrator(ctx, admin, false)

	return err
}

// initialAdministrator crea el admin de plataforma si la instalación está vacía.
func (f *Feature) initialAdministrator(
	ctx context.Context,
	admin Admin,
	withSession bool,
) (models.User, string, error) {
	name := strings.TrimSpace(admin.Name)
	lastName := strings.TrimSpace(admin.LastName)
	email := strings.ToLower(strings.TrimSpace(admin.Email))
	if !utils.ValidEmail(email) || !utils.Required(name, 120) || !utils.Required(lastName, 120) ||
		!utils.ValidPassword(admin.Password) {
		return models.User{}, "", apperrors.Invalid(constants.MsgAccountDataRequired)
	}

	documentType, documentNumber, ok := utils.NormalizeDocument(admin.DocumentType, admin.DocumentNumber)
	if !ok {
		return models.User{}, "", apperrors.Invalid(constants.MsgUserDocumentRequired)
	}

	encoded, err := auth.HashPassword(admin.Password)
	if err != nil {
		return models.User{}, "", err
	}

	var user models.User
	var raw string

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if err := q.BootstrapLock(ctx); err != nil {
			return err
		}

		n, err := q.CountUsers(ctx)
		if err != nil {
			return err
		}

		if n != 0 {
			return apperrors.Conflict(constants.MsgAlreadyInstalled)
		}

		u, err := q.CreateUser(
			ctx,
			repository.CreateUserParams{
				ID:             utils.NewID(),
				Name:           name,
				LastName:       lastName,
				Email:          email,
				DocumentType:   documentType,
				DocumentNumber: documentNumber,
				IsSuperAdmin:   true,
				EmailVerified:  true,
			},
		)
		if err != nil {
			return err
		}

		user = u

		if err = q.CreateCredential(
			ctx,
			repository.CreateCredentialParams{ID: utils.NewID(), UserID: u.ID, AccountID: u.ID, Password: &encoded},
		); err != nil {
			return err
		}

		if withSession {
			_, raw, err = f.deps.Auth.NewContext(u.ID, constants.AuthLocal)
			if err != nil {
				return err
			}
		}

		return audit.Record(
			ctx,
			q,
			auth.Principal{UserID: u.ID},
			constants.AuditPlatformInstalled,
			constants.EntityAuth,
			u.ID,
			nil,
			map[string]string{"email": email},
		)
	})

	return user, raw, err
}
