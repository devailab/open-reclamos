package documents

import (
	"context"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/storage"
	"openreclamos.com/api/internal/shared/utils"
)

// StoredPDF devuelve la constancia o la respuesta guardada; la primera vez la genera,
// la sube al storage y registra su clave para servir siempre el mismo documento.
func (f *Feature) StoredPDF(ctx context.Context, c models.Complaint, response bool) ([]byte, error) {
	workflow := constants.EmailReceipt

	if response {
		workflow = constants.EmailResponse
	}

	key, err := f.documentKey(ctx, c, response)
	if err != nil {
		return nil, err
	}

	if key != "" {
		return f.deps.Storage.Get(ctx, key)
	}

	data, err := f.complaintPDF(ctx, c, response)
	if err != nil {
		return nil, err
	}

	key = storage.PrefixDocuments + c.OrganizationID + "/" + c.ID + "/" + workflow + "-" + utils.NewID() + ".pdf"

	if err = f.deps.Storage.Put(ctx, key, constants.ContentTypePDF, data); err != nil {
		return nil, err
	}

	// Las entregas se crean al registrar el reclamo; el upsert cubre filas faltantes.
	if err = f.deps.Repo.UpsertDeliveries(ctx, repository.UpsertDeliveriesParams{ID: utils.NewID(), OrganizationID: c.OrganizationID, ComplaintID: c.ID}); err != nil {
		_ = f.deps.Storage.Delete(ctx, key)

		return nil, err
	}

	saved, err := f.deps.Repo.SetDocumentKey(
		ctx,
		repository.SetDocumentKeyParams{
			ComplaintID:    c.ID,
			OrganizationID: c.OrganizationID,
			Workflow:       workflow,
			Key:            key,
		},
	)

	if err != nil || !saved {
		_ = f.deps.Storage.Delete(ctx, key)
	}

	if err != nil {
		return nil, err
	}

	if saved {
		return data, nil
	}

	// Otro proceso guardó primero su documento: servir ese para que todos coincidan.
	winner, err := f.documentKey(ctx, c, response)
	if err != nil {
		return nil, err
	}

	return f.deps.Storage.Get(ctx, winner)
}

func (f *Feature) documentKey(ctx context.Context, c models.Complaint, response bool) (string, error) {
	delivery, err := f.deps.Repo.GetDeliveries(
		ctx,
		repository.GetDeliveriesParams{OrganizationID: c.OrganizationID, ComplaintID: c.ID},
	)
	if repository.IsNotFound(err) {
		return "", nil
	}

	if err != nil {
		return "", err
	}

	if response {
		return utils.Value(delivery.ResponseDocumentKey), nil
	}

	return utils.Value(delivery.ReceiptDocumentKey), nil
}
