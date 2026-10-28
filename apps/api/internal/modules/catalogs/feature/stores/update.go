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

// Update modifica los datos de una tienda autorizada.
func (f *Feature) Update(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if err := validateScope(p.CanStore(in.ID), in.ID); err != nil {
		return operation.Output{}, err
	}

	d := in.Data

	if err := Validate(d); err != nil {
		return operation.Output{}, err
	}

	var out models.Store
	var slug *string
	if _, present := d["slug"]; present {
		value := utils.Text(d, "slug")
		if !utils.SlugPattern.MatchString(value) || len(value) > 120 {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidSlug)
		}
		slug = &value
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if slug != nil {
			used, err := q.StoreSlugInUse(ctx, *slug, in.ID)
			if err != nil {
				return err
			}
			if used {
				return apperrors.Conflict(constants.MsgSlugTaken)
			}
		}

		var err error

		out, err = q.UpdateStore(
			ctx,
			repository.UpdateStoreParams{
				ID:             in.ID,
				Slug:           slug,
				OrganizationID: p.OrganizationID,
				Name:           utils.Text(d, "name"),
				Type:           utils.Text(d, "type"),
				Color:          strings.ToUpper(utils.Text(d, "color")),
				UbigeoID:       utils.Text(d, "ubigeo_id"),
				AddressType:    utils.Text(d, "address_type"),
				Address:        utils.Text(d, "address"),
				Url:            utils.Text(d, "url"),
				UpdatedBy:      &p.UserID,
			},
		)
		if err != nil {
			return err
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditStoreUpdated,
			constants.EntityStore,
			in.ID,
			nil,
			map[string]string{"name": out.Name},
		)
	})

	return operation.Record(out), err
}
