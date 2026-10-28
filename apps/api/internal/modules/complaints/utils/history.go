package utils

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/utils"
)

// AddHistory registra un evento del historial visible para el consumidor.
func AddHistory(
	ctx context.Context,
	q *repository.Repository,
	p auth.Principal,
	id, event, from, to, publicNote string,
) error {
	return q.AddHistory(
		ctx,
		repository.AddHistoryParams{
			ID:              utils.NewID(),
			ComplaintID:     id,
			EventType:       event,
			FromStatus:      from,
			ToStatus:        to,
			PublicNote:      publicNote,
			PerformedBy:     p.UserID,
			PerformedByRole: p.Role,
		},
	)
}
