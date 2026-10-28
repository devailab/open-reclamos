package documents

import (
	"context"
	complaintutils "openreclamos.com/api/internal/modules/complaints/utils"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

// Receipt descarga la constancia de recepción.
func (f *Feature) Receipt(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	return f.document(ctx, p, in, false, "constancia-")
}

// ResponsePDF descarga la respuesta oficial.
func (f *Feature) ResponsePDF(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	return f.document(ctx, p, in, true, "respuesta-")
}

func (f *Feature) document(
	ctx context.Context,
	p auth.Principal,
	in operation.Input,
	response bool,
	prefix string,
) (operation.Output, error) {
	c, err := complaintutils.Load(ctx, f.deps.Repo, p, in.ID, false)
	if err != nil {
		return operation.Output{}, err
	}

	b, err := f.StoredPDF(ctx, c, response)

	return operation.File(b, prefix+c.Correlative+".pdf", constants.ContentTypePDF), err
}
