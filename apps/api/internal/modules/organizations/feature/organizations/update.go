package organizations

import (
	"context"

	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Update modifica los datos de la empresa activa.
func (f *Feature) Update(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	d := in.Data

	if err := validate(d); err != nil {
		return operation.Output{}, err
	}

	color := utils.Text(d, "primary_color")
	if color != "" && !utils.ColorPattern.MatchString(color) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidColor)
	}

	var out models.Organization
	var slug *string
	if _, present := d["slug"]; present {
		value := utils.Text(d, "slug")
		if !utils.SlugPattern.MatchString(value) || len(value) > 100 {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidSlug)
		}

		slug = &value
	}
	var businessDomain *string

	if value, present := d["business_domain"]; present {
		if value != nil {
			if _, ok := value.(string); !ok {
				return operation.Output{}, apperrors.Invalid(constants.MsgInvalidBusinessDomain)
			}
		}

		domain := utils.NormalizeBusinessDomain(utils.Text(d, "business_domain"))
		if !utils.ValidBusinessDomain(domain) {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidBusinessDomain)
		}

		businessDomain = &domain
	}

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		if slug != nil {
			used, err := q.OrganizationSlugInUse(ctx, *slug, p.OrganizationID)
			if err != nil {
				return err
			}
			if used {
				return apperrors.Conflict(constants.MsgSlugTaken)
			}
		}

		if businessDomain != nil {
			if err := q.LockBusinessDomains(ctx); err != nil {
				return err
			}

			if *businessDomain != "" {
				used, err := q.BusinessDomainInUse(ctx, *businessDomain, p.OrganizationID)
				if err != nil {
					return err
				}

				if used {
					return apperrors.Conflict(constants.MsgBusinessDomainTaken)
				}
			}
		}

		var err error

		out, err = q.UpdateOrganization(
			ctx,
			repository.UpdateOrganizationParams{
				ID:             p.OrganizationID,
				Slug:           slug,
				BusinessDomain: businessDomain,
				Name:           utils.Text(d, "name"),
				LegalName:      utils.Text(d, "legal_name"),
				UbigeoID:       utils.Text(d, "ubigeo_id"),
				AddressType:    utils.Text(d, "address_type"),
				Address:        utils.Text(d, "address"),
				PhoneCode:      utils.Text(d, "phone_code"),
				Phone:          utils.Text(d, "phone"),
				Website:        utils.Text(d, "website"),
				PrimaryColor:   color,
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
			constants.AuditOrganizationUpdated,
			constants.EntityOrganization,
			p.OrganizationID,
			nil,
			map[string]string{"name": out.Name, "business_domain": utils.Value(out.BusinessDomain)},
		)
	})

	return operation.Record(out), err
}
