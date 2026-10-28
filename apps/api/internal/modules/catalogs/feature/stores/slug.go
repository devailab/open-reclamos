package stores

import (
	"context"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// SuggestSlug propone un slug libre para una tienda.
func (f *Feature) SuggestSlug(ctx context.Context, _ auth.Principal, in operation.Input) (operation.Output, error) {
	if _, present := in.Data["slug"]; present {
		if in.ID != "" && !utils.ValidID(in.ID) {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidIdentifier)
		}

		slug := utils.Text(in.Data, "slug")
		if !utils.SlugPattern.MatchString(slug) || len(slug) > 120 {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidSlug)
		}

		used, err := f.deps.Repo.StoreSlugInUse(ctx, slug, in.ID)

		return operation.Record(map[string]any{"slug": slug, "available": !used}), err
	}

	slug, err := utils.UniqueSlug(ctx, utils.Text(in.Data, "name"), f.deps.Repo.StoreSlugExists)
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Record(map[string]string{"slug": slug}), nil
}
