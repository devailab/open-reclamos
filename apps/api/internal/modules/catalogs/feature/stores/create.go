package stores

import (
	"context"
	"strings"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Create registra una tienda; si el admin tiene tiendas seleccionadas, se la asigna.
func (f *Feature) Create(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	d := in.Data

	if err := Validate(d); err != nil {
		return operation.Output{}, err
	}

	slug := utils.Text(d, "slug")
	if slug == "" {
		var err error
		slug, err = utils.UniqueSlug(ctx, utils.Text(d, "name"), f.deps.Repo.StoreSlugExists)
		if err != nil {
			return operation.Output{}, err
		}
	}

	if !utils.SlugPattern.MatchString(slug) || len(slug) > 120 {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidSlug)
	}

	var out models.Store

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		used, err := q.StoreSlugExists(ctx, slug)
		if err != nil {
			return err
		}
		if used {
			return apperrors.Conflict(constants.MsgSlugTaken)
		}

		out, err = q.CreateStore(
			ctx,
			repository.CreateStoreParams{
				ID:             utils.NewID(),
				OrganizationID: p.OrganizationID,
				Slug:           slug,
				Name:           utils.Text(d, "name"),
				Type:           utils.Text(d, "type"),
				Color:          strings.ToUpper(utils.Text(d, "color")),
				UbigeoID:       utils.Text(d, "ubigeo_id"),
				AddressType:    utils.Text(d, "address_type"),
				Address:        utils.Text(d, "address"),
				Url:            utils.Text(d, "url"),
				CreatedBy:      &p.UserID,
			},
		)
		if err != nil {
			return err
		}

		if !p.AllStores {
			if err := q.AssignStore(ctx, repository.AssignStoreParams{UserID: p.UserID, OrganizationID: p.OrganizationID, StoreID: out.ID, CreatedBy: &p.UserID}); err != nil {
				return err
			}
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditStoreCreated,
			constants.EntityStore,
			out.ID,
			nil,
			map[string]string{"name": out.Name},
		)
	})

	return operation.Record(out), err
}
