package documents

import (
	"bytes"
	"context"
	"fmt"
	"io"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/storage"
	"openreclamos.com/api/internal/shared/utils"
)

func (f *Feature) bookPDF(
	ctx context.Context,
	p auth.Principal,
	in operation.Input,
	rows []repository.ComplaintListItem,
	fileName string,
) (operation.Output, error) {
	organization, err := f.deps.Repo.GetOrganization(ctx, p.OrganizationID)
	if err != nil {
		return operation.Output{}, err
	}

	storeName := "Todas las tiendas"

	if storeID := utils.FilterText(in.Filters, "store_id"); storeID != "" {
		store, err := f.deps.Repo.GetHistoricalStore(
			ctx,
			repository.GetStoreParams{ID: storeID, OrganizationID: p.OrganizationID},
		)
		if err != nil {
			return operation.Output{}, err
		}

		storeName = store.Name
	}

	cover, err := renderBookCover(organization, storeName, in.Filters, len(rows))
	if err != nil {
		return operation.Output{}, err
	}

	if len(rows) == 0 {
		return operation.File(cover, fileName, constants.ContentTypePDF), nil
	}

	documents := make([]io.ReadSeeker, 0, len(rows)+1)
	documents = append(documents, bytes.NewReader(cover))

	for _, complaint := range rows {
		if err := ctx.Err(); err != nil {
			return operation.Output{}, err
		}

		document, err := f.bookDocument(ctx, complaint.Complaint)
		if err != nil {
			return operation.Output{}, fmt.Errorf("constancia %s: %w", complaint.Correlative, err)
		}

		documents = append(documents, bytes.NewReader(document))
	}

	var merged bytes.Buffer

	if err := pdfapi.MergeRaw(documents, &merged, false, nil); err != nil {
		return operation.Output{}, err
	}

	return operation.File(merged.Bytes(), fileName, constants.ContentTypePDF), nil
}

func (f *Feature) bookDocument(ctx context.Context, complaint models.Complaint) ([]byte, error) {
	delivery, err := f.deps.Repo.GetDeliveries(ctx, repository.GetDeliveriesParams{
		OrganizationID: complaint.OrganizationID, ComplaintID: complaint.ID,
	})
	if err != nil && !repository.IsNotFound(err) {
		return nil, err
	}

	if key := utils.Value(delivery.ResponseDocumentKey); key != "" {
		document, err := f.deps.Storage.Get(ctx, key)
		if err == nil {
			return document, nil
		}

		if !storage.IsNotFound(err) {
			return nil, err
		}
	}

	return f.StoredPDF(ctx, complaint, false)
}
