package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/utils"
)

// maxStoredResponse limita el cuerpo de respuesta guardado por entrega.
const maxStoredResponse = 4000

// Worker entrega webhooks encolados.
type Worker struct {
	river.WorkerDefaults[jobs.WebhookArgs]
	Feature *Feature
}

func (w *Worker) Work(ctx context.Context, j *river.Job[jobs.WebhookArgs]) error {
	return w.Feature.Deliver(ctx, j.Args)
}

// Deliver envía la entrega firmada y guarda el resultado; errores 4xx definitivos cancelan reintentos.
func (f *Feature) Deliver(ctx context.Context, args jobs.WebhookArgs) error {
	delivery, err := f.deps.Repo.GetWebhookDelivery(
		ctx,
		repository.GetWebhookDeliveryParams{ID: args.DeliveryID, OrganizationID: args.OrganizationID},
	)
	if err != nil || delivery.Status == constants.DeliverySent {
		return err
	}

	endpoint, err := f.deps.Repo.GetWebhook(
		ctx,
		repository.GetWebhookParams{ID: utils.Value(delivery.EndpointID), OrganizationID: args.OrganizationID},
	)
	if err != nil {
		return err
	}

	if endpoint.Status != constants.StatusActive {
		return nil
	}

	req, err := f.signedRequest(ctx, endpoint, delivery)
	if err != nil {
		return err
	}

	response, sendErr := f.deps.HTTP.Safe(time.Duration(endpoint.TimeoutMs) * time.Millisecond).Do(req)
	var status int32
	var responseBody string

	if response != nil {
		status = int32(response.StatusCode)
		body, _ := io.ReadAll(io.LimitReader(response.Body, maxStoredResponse))
		responseBody = string(body)

		response.Body.Close()

		if status < 200 || status >= 300 {
			sendErr = fmt.Errorf("HTTP %d", status)
		}
	}

	state, errorMessage := constants.DeliverySent, ""

	if sendErr != nil {
		state = constants.DeliveryFailed
		errorMessage = constants.MsgWebhookDeliveryFailed
	}

	if err = f.deps.Repo.SetWebhookDelivery(ctx, repository.SetWebhookDeliveryParams{ID: delivery.ID, OrganizationID: args.OrganizationID, Status: state, ResponseStatus: responseStatus(status), ErrorMessage: utils.Ptr(errorMessage), ResponseBody: utils.Ptr(responseBody)}); err != nil {
		return err
	}

	if permanentFailure(status) {
		return river.JobCancel(sendErr)
	}

	return sendErr
}

// signedRequest arma el POST con X-Webhook-Signature = HMAC-SHA256(timestamp.body).
func (f *Feature) signedRequest(
	ctx context.Context,
	endpoint models.WebhookEndpoint,
	delivery models.WebhookDelivery,
) (*http.Request, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		endpoint.TargetUrl,
		bytes.NewReader(delivery.RequestBody),
	)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", constants.ContentTypeJSON)
	req.Header.Set("X-Webhook-Id", delivery.ID)

	if endpoint.SecretEncrypted == nil {
		return req, nil
	}

	secret, err := utils.Decrypt(f.deps.Config.WebhookEncryptionKey, endpoint.ID, *endpoint.SecretEncrypted)
	if err != nil {
		return nil, err
	}

	timestamp := fmt.Sprint(time.Now().Unix())
	mac := hmac.New(sha256.New, []byte(secret))

	mac.Write([]byte(timestamp + "." + string(delivery.RequestBody)))
	req.Header.Set("X-Webhook-Timestamp", timestamp)
	req.Header.Set("X-Webhook-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))

	return req, nil
}

// permanentFailure indica respuestas 4xx que no mejoran al reintentar.
func permanentFailure(status int32) bool {
	return status >= 400 && status < 500 && status != 408 && status != 425 && status != 429
}

func responseStatus(status int32) *int32 {
	if status == 0 {
		return nil
	}

	return &status
}
