// Package jobs encola trabajos River en la misma transacción que el cambio de dominio.
package jobs

import (
	"context"
	"database/sql"
	"time"

	"github.com/riverqueue/river"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// Queue envuelve el cliente River; Client es nil hasta llamar Start.
type Queue struct {
	Client *river.Client[*sql.Tx]
	Config *config.Config
}

// Start crea el cliente con los workers indicados y lo inicia si WORKERS_ENABLED.
func (q *Queue) Start(ctx context.Context, db *gorm.DB, workers *river.Workers) error {
	if db == nil {
		return nil
	}

	driver, err := database.RiverDriver(db)
	if err != nil {
		return err
	}

	client, err := river.NewClient(
		driver,
		&river.Config{
			Workers: workers,
			Queues:  map[string]river.QueueConfig{river.QueueDefault: {MaxWorkers: 3}},
			PeriodicJobs: []*river.PeriodicJob{
				river.NewPeriodicJob(
					river.PeriodicInterval(time.Hour),
					func() (river.JobArgs, *river.InsertOpts) { return CleanupArgs{}, nil },
					&river.PeriodicJobOpts{RunOnStart: true},
				),
			},
		},
	)
	if err != nil {
		return err
	}

	q.Client = client

	if q.Config.WorkersEnabled {
		return client.Start(ctx)
	}

	return nil
}

// Stop detiene los workers si se iniciaron.
func (q *Queue) Stop(ctx context.Context) error {
	if q.Client == nil || !q.Config.WorkersEnabled {
		return nil
	}

	return q.Client.Stop(ctx)
}

// Ready indica si ya existe cliente River.
func (q *Queue) Ready() bool { return q.Client != nil }

// Insert encola fuera de una transacción.
func (q *Queue) Insert(ctx context.Context, args river.JobArgs, opts *river.InsertOpts) error {
	if !q.Ready() {
		return apperrors.Conflict(constants.MsgWorkersNotReady)
	}

	_, err := q.Client.Insert(ctx, args, opts)

	return err
}

// InsertTx encola dentro de la transacción de tx.
func (q *Queue) InsertTx(
	ctx context.Context,
	tx *repository.Repository,
	args river.JobArgs,
	opts *river.InsertOpts,
) error {
	if !q.Ready() {
		return apperrors.Conflict(constants.MsgWorkersNotReady)
	}

	_, err := q.Client.InsertTx(ctx, tx.SQLTx(), args, opts)

	return err
}

// EnqueueEmail encola un correo del reclamo; sin SMTP no hace nada.
func (q *Queue) EnqueueEmail(ctx context.Context, tx *repository.Repository, org, complaintID, workflow string) error {
	if !q.Config.SMTPEnabled {
		return nil
	}

	if !q.Ready() {
		return apperrors.Conflict(constants.MsgWorkersNotStarted)
	}

	_, err := q.Client.InsertTx(
		ctx,
		tx.SQLTx(),
		EmailArgs{OrganizationID: org, ComplaintID: complaintID, Workflow: workflow},
		&river.InsertOpts{MaxAttempts: 5, UniqueOpts: river.UniqueOpts{ByArgs: true}},
	)

	return err
}

// EnqueueEvent registra y encola una entrega por cada webhook suscrito al evento.
func (q *Queue) EnqueueEvent(
	ctx context.Context,
	tx *repository.Repository,
	org, complaintID, event string,
	payload any,
) error {
	endpoints, err := tx.MatchingWebhooks(ctx, repository.MatchingWebhooksParams{OrganizationID: org, EventKey: event})
	if err != nil {
		return err
	}

	for _, endpoint := range endpoints {
		if !q.Ready() {
			return apperrors.Conflict(constants.MsgWorkersNotStarted)
		}

		deliveryID := utils.NewID()

		body := map[string]any{
			"event":          event,
			"organizationId": org,
			"entityId":       complaintID,
			"entityType":     constants.EntityComplaint,
			"payload":        payload,
			"timestamp":      time.Now().UTC().Format(time.RFC3339Nano),
		}

		if err = tx.AddWebhookDelivery(ctx, repository.AddWebhookDeliveryParams{ID: deliveryID, OrganizationID: org, EndpointID: &endpoint.ID, EventKey: event, EntityType: constants.EntityComplaint, EntityID: &complaintID, RequestBody: utils.JSONBytes(body)}); err != nil {
			return err
		}

		if _, err = q.Client.InsertTx(ctx, tx.SQLTx(), WebhookArgs{OrganizationID: org, DeliveryID: deliveryID}, &river.InsertOpts{MaxAttempts: 8, UniqueOpts: river.UniqueOpts{ByArgs: true}}); err != nil {
			return err
		}
	}

	return nil
}
