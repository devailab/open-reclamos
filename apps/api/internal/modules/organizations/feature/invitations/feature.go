// Package invitations invita personas a una empresa y gestiona su aceptación.
package invitations

import (
	"context"
	"time"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/deps"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// lifetime es la vigencia de un enlace de invitación.
const lifetime = 7 * 24 * time.Hour

type Feature struct{ deps *deps.Deps }

func New(d *deps.Deps) *Feature { return &Feature{deps: d} }

// link arma la URL pública que recibe la persona invitada.
func (f *Feature) link(raw string) string {
	return f.deps.Config.PublicBaseURL + constants.PathInvitation + raw
}

// valid busca la invitación por token y exige que siga pendiente y vigente.
func (f *Feature) valid(ctx context.Context, raw string) (repository.InvitationDetails, error) {
	i, err := f.deps.Repo.GetInvitationByToken(ctx, utils.Hash(raw))
	if err != nil {
		return i, err
	}

	if i.AcceptedAt != nil || i.RevokedAt != nil || !i.ExpiresAt.After(time.Now()) ||
		i.Status != constants.StatusActive {
		return i, apperrors.Conflict(constants.MsgInvitationUnavailable)
	}

	return i, nil
}
