package invitations

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Accept une a la persona invitada (nueva o existente) y abre su sesión.
func (f *Feature) Accept(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	i, err := f.valid(ctx, in.ID)
	if err != nil {
		return operation.Output{}, err
	}

	email := strings.ToLower(utils.Text(in.Data, "email"))
	if email != i.Email {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvitationEmailMismatch)
	}

	password := utils.RawText(in.Data, "password")
	existing, lookupErr := f.deps.Repo.GetUserByEmail(ctx, email)
	userID := existing.ID
	newUser := repository.IsNotFound(lookupErr)
	if !newUser &&
		(lookupErr != nil || existing.Password == nil || !existing.Active || !auth.CheckPassword(utils.Value(existing.Password), password)) {
		return operation.Output{}, apperrors.Unauthorized()
	}

	name := utils.Text(in.Data, "name")
	lastName := utils.Text(in.Data, "last_name")
	if newUser && (!utils.Required(name, 120) || !utils.Required(lastName, 120) || !utils.ValidPassword(password)) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvitationAccountRequired)
	}

	documentType, documentNumber, validDocument := utils.UserDocument(in.Data)
	if newUser && !validDocument {
		return operation.Output{}, apperrors.Invalid(constants.MsgUserDocumentRequired)
	}

	var encoded string

	if newUser {
		encoded, err = auth.HashPassword(password)
		if err != nil {
			return operation.Output{}, err
		}
	}

	var raw string

	err = f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if _, err := q.LockInvitation(ctx, repository.LockInvitationParams{ID: i.ID, TokenHash: i.TokenHash}); err != nil {
			return err
		}

		if newUser {
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

			// El token enviado al email invitado ya prueba el control del correo.
			u, err := q.CreateUser(ctx, repository.CreateUserParams{
				ID: utils.NewID(), Name: name, LastName: lastName, Email: email,
				DocumentType: documentType, DocumentNumber: documentNumber, EmailVerified: true,
			})
			if err != nil {
				return err
			}

			userID = u.ID

			if err = q.CreateCredential(ctx, repository.CreateCredentialParams{ID: utils.NewID(), UserID: userID, AccountID: userID, Password: &encoded}); err != nil {
				return err
			}
		}

		if err := q.CreateMember(ctx, repository.CreateMemberParams{UserID: userID, OrganizationID: i.OrganizationID, Role: i.Role, StoreAccessMode: i.StoreAccessMode, CreatedBy: i.CreatedBy}); err != nil {
			return err
		}

		if err := q.CopyInvitationStores(ctx, repository.CopyInvitationStoresParams{UserID: userID, InvitationID: i.ID}); err != nil {
			return err
		}

		if err := apperrors.Changed(q.AcceptInvitation(ctx, repository.AcceptInvitationParams{ID: i.ID, AcceptedBy: &userID})); err != nil {
			return err
		}

		_, t, err := f.deps.Auth.NewContext(userID, constants.AuthLocal)
		if err != nil {
			return err
		}

		raw = t

		// Con SSO obligatorio la empresa se activa recién al completar el login SSO.
		if i.LoginMode != constants.LoginModeSSORequired {
			if raw, err = f.deps.Auth.UpdateContext(raw, i.OrganizationID, nil); err != nil {
				return err
			}
		}

		return audit.Record(
			ctx,
			q,
			auth.Principal{UserID: userID, OrganizationID: i.OrganizationID},
			constants.AuditInvitationAccepted,
			constants.EntityInvitation,
			i.ID,
			nil,
			nil,
		)
	})
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Login(f.deps.Auth, raw, map[string]string{"id": userID, "email": email})
}
